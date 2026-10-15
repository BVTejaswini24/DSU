/**
 * CarbonTwin API server.
 *
 * Boot sequence:
 *   1. Load env vars from server/.env (path is fixed, cwd-independent)
 *   2. Connect to MongoDB Atlas (non-fatal: retries with backoff; until
 *      connected, DB-backed endpoints respond 503)
 *   3. Connect to Redis (non-fatal: falls back to in-memory cache)
 *   4. Initialise Express + Socket.io
 *   5. Schedule the daily Eco-Nudge cron once MongoDB is up
 */

const path = require('path');

// Always load server/.env from this file's directory so the server works
// regardless of the shell's current working directory.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');

const routes = require('./src/routes/index');
const { connectRedis } = require('./src/services/RedisService');
const { startNudgeCron } = require('./src/jobs/nudgeCron');
const { validateMongoUri, connectMongo, configureSrvDns } = require('./src/config/mongo');

mongoose.set('bufferCommands', false);

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174'
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, true); // permissive for hackathon demo
    },
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    name: 'CarbonIQ API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/health'
  });
});

app.use((err, req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const bootstrap = async () => {
  if (!process.env.JWT_SECRET) {
    console.warn('[Server] JWT_SECRET is not set. Using the built-in dev fallback; set JWT_SECRET in server/.env for production.');
  }

  await connectRedis();

  const server = app.listen(PORT, () => {
    console.log(`[Server] CarbonTwin API listening on http://localhost:${PORT}`);
    console.log(`[Server] Frontend expected at ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  });

  const { init } = require('./src/services/SocketService');
  init(server);

  const mongoUri = process.env.MONGO_URI;
  const mongoDbName = process.env.MONGO_DB || 'carbontwin';
  const validation = validateMongoUri(mongoUri);

  if (!validation.ok) {
    console.warn(`[MongoDB] ${validation.reason}`);
    console.warn(`[MongoDB] ${validation.hint}`);
    console.warn('[Server] Running without database. Authenticated endpoints will return 503 until MONGO_URI is configured.');
    return;
  }

  // Resolve SRV records before the driver initializes: some networks' default
  // DNS resolvers refuse SRV queries (querySrv ECONNREFUSED on _mongodb._tcp.*).
  await configureSrvDns(mongoUri);

  // Non-fatal: keeps retrying until Atlas is reachable, then restores
  // DB-backed endpoints (503s stop) and starts the Eco-Nudge cron.
  await connectMongo({
    uri: mongoUri,
    dbName: mongoDbName,
    onConnected: startNudgeCron
  });
};

bootstrap();

module.exports = app;
