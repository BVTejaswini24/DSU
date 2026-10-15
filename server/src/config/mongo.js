/**
 * mongo.js
 * MongoDB connection helpers for the CarbonTwin server.
 *
 * - validateMongoUri(): catches missing / placeholder / malformed MONGO_URI
 *   values before mongoose attempts a DNS lookup, and returns an actionable hint.
 * - redactMongoUri(): strips credentials from anything that looks like a
 *   MongoDB connection string so logs never contain passwords.
 * - connectMongo(): connects with retries and capped backoff. If the first
 *   attempt fails (network blip, Atlas paused, wrong URI later fixed), the
 *   server keeps retrying and fully restores DB-backed features on success.
 */

const mongoose = require('mongoose');
const dns = require('dns');

/**
 * Resolvers used when the system resolver cannot answer SRV queries
 * (symptom: querySrv ECONNREFUSED / ETIMEOUT on _mongodb._tcp.<host>).
 */
const PUBLIC_DNS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
const DNS_PROBE_TIMEOUT_MS = 5000;

const ATLAS_SETUP_HINT =
  'Get a real connection string from MongoDB Atlas: Database -> Connect -> Drivers, ' +
  'then set MONGO_URI (and optional MONGO_DB) in server/.env. ' +
  'See server/.env.example for the expected format. Never commit real credentials.';

const PLACEHOLDER_RE = /<[^>]+>/;
const MONGO_SCHEME_RE = /^mongodb(\+srv)?:\/\//i;

/** Returns { ok: true } or { ok: false, reason, hint }. Never throws. */
const validateMongoUri = (uri) => {
  if (!uri || !String(uri).trim()) {
    return {
      ok: false,
      reason: 'MONGO_URI is not set.',
      hint: ATLAS_SETUP_HINT
    };
  }

  if (PLACEHOLDER_RE.test(uri)) {
    return {
      ok: false,
      reason: 'MONGO_URI still contains placeholder values (e.g. <user>, <pass>, <cluster>).',
      hint: ATLAS_SETUP_HINT
    };
  }

  if (!MONGO_SCHEME_RE.test(String(uri).trim())) {
    return {
      ok: false,
      reason: 'MONGO_URI must start with mongodb:// or mongodb+srv://.',
      hint: ATLAS_SETUP_HINT
    };
  }

  return { ok: true };
};

/**
 * Removes user:password from any mongodb connection string in free-form text.
 * Example: "auth error for mongodb+srv://u:p@host/db" -> "...mongodb+srv://<redacted>@host/db"
 */
const redactMongoUri = (text) =>
  String(text).replace(/mongodb(\+srv)?:\/\/[^\s'"]+/gi, (match) => {
    const scheme = match.toLowerCase().startsWith('mongodb+srv') ? 'mongodb+srv' : 'mongodb';
    const authority = match.split('://')[1] || '';
    const at = authority.lastIndexOf('@');
    const hostPart = at >= 0 ? authority.slice(at + 1) : '';
    return hostPart ? `${scheme}://<redacted>@${hostPart}` : `${scheme}://<redacted>`;
  });

/** Extracts the hostname from a mongodb+srv:// connection string. */
const extractSrvHost = (uri) => {
  const m = /^mongodb\+srv:\/\/(?:[^@/]+)@([^/?#]+)/i.exec(String(uri || '').trim());
  return m ? m[1].split(':')[0].toLowerCase() : null;
};

/** Probes SRV resolution with a hard timeout. Never throws. */
const probeSrv = async (hostname) => {
  let timer;
  try {
    await Promise.race([
      dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('DNS probe timeout'), { code: 'ETIMEOUT' })), DNS_PROBE_TIMEOUT_MS);
      })
    ]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.code || err.message };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Configures DNS resolution so mongodb+srv:// SRV lookups succeed, BEFORE
 * mongoose connects. Some networks' default resolvers refuse SRV queries
 * (querySrv ECONNREFUSED on _mongodb._tcp.<cluster>), while direct queries
 * to public resolvers work.
 *
 * Strategy (idempotent, never throws):
 *   1. DNS_SERVERS=<list>  -> use exactly those resolvers (DNS_SERVERS=system keeps the OS default).
 *   2. Otherwise probe the default resolver first; if it answers SRV, leave everything untouched.
 *   3. If it fails, switch to public resolvers and probe again.
 *   4. If public resolvers are also blocked, restore the original servers and
 *      log actionable options instead of pretending the issue is fixed.
 */
const configureSrvDns = async (uri) => {
  const host = extractSrvHost(uri);
  if (!host) return { applied: false, reason: 'not-an-srv-uri' };

  const originalServers = dns.getServers();

  const override = String(process.env.DNS_SERVERS || '').trim();
  if (override) {
    if (override.toLowerCase() === 'system') {
      console.log('[MongoDB] DNS_SERVERS=system: using the OS default resolver for SRV lookups.');
      return { applied: false, reason: 'system-forced' };
    }
    const servers = override.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      dns.setServers(servers);
    } catch (err) {
      console.warn(`[MongoDB] DNS_SERVERS is not a valid resolver list (${err.message}). Keeping OS default.`);
      dns.setServers(originalServers);
      return { applied: false, reason: 'invalid-dns-servers' };
    }
    const probe = await probeSrv(host);
    if (probe.ok) {
      console.log(`[MongoDB] SRV lookup for ${host} works via DNS_SERVERS (${servers.length} resolver(s)).`);
      return { applied: true, servers };
    }
    console.warn(`[MongoDB] DNS_SERVERS (${servers.join(', ')}) failed SRV lookup for ${host} (${probe.error}). Falling back to probing.`);
    dns.setServers(originalServers);
  }

  const systemProbe = await probeSrv(host);
  if (systemProbe.ok) {
    console.log(`[MongoDB] SRV lookup for ${host} resolves with the default DNS resolver.`);
    return { applied: false, reason: 'system-ok' };
  }

  console.warn(`[MongoDB] Default DNS resolver failed SRV lookup for _mongodb._tcp.${host} (${systemProbe.error}). Trying public resolvers (${PUBLIC_DNS.join(', ')})...`);
  try {
    dns.setServers(PUBLIC_DNS);
  } catch (err) {
    console.warn(`[MongoDB] Could not switch DNS servers: ${err.message}`);
    return { applied: false, reason: 'set-servers-failed' };
  }

  const publicProbe = await probeSrv(host);
  if (publicProbe.ok) {
    console.log(`[MongoDB] SRV lookup for ${host} works via public DNS. Backend will use it for the Atlas connection.`);
    return { applied: true, servers: PUBLIC_DNS };
  }

  dns.setServers(originalServers);
  console.error(`[MongoDB] SRV lookup for _mongodb._tcp.${host} failed with both the default resolver (${systemProbe.error}) and public resolvers (${publicProbe.error}).`);
  console.error('[MongoDB] Direct DNS queries to public resolvers appear to be blocked on this network, and the default resolver does not answer SRV queries.');
  console.error('[MongoDB] Options: (1) set DNS_SERVERS=<comma-separated resolvers that support SRV> in server/.env, (2) fix the router/system DNS, or (3) use a non-SRV mongodb:// connection string from Atlas (Connect -> Drivers, choose a non-SRV host).');
  return { applied: false, reason: 'public-dns-blocked' };
};

/**
 * Connect to MongoDB, retrying with capped backoff until it succeeds.
 * Calls onConnected() on every successful (re)connection exactly once per
 * connect event, so callers can lazily start DB-dependent jobs.
 */
const connectMongo = async ({
  uri,
  dbName,
  onConnected,
  serverSelectionTimeoutMS = 10000,
  connectTimeoutMS = 10000,
  baseRetryMs = 5000,
  maxRetryMs = 60000
} = {}) => {
  let attempt = 0;
  let connectedOnce = false;

  mongoose.connection.removeAllListeners('disconnected');
  mongoose.connection.removeAllListeners('reconnected');
  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected. Auth and DB endpoints will return 503 until it recovers.');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Reconnected to Atlas cluster. DB-backed features are available again.');
    if (onConnected) onConnected();
  });

  const attemptConnect = async () => {
    attempt += 1;
    try {
      await mongoose.connect(uri, {
        ...(dbName ? { dbName } : {}),
        serverSelectionTimeoutMS,
        connectTimeoutMS
      });
      console.log(
        `[MongoDB] Connected to cluster${dbName ? ` (db: ${dbName})` : ''} after ${attempt} attempt(s)`
      );
      if (connectedOnce) {
        console.log('[MongoDB] DB-backed features restored.');
      }
      connectedOnce = true;
      if (onConnected) onConnected();
    } catch (err) {
      const delay = Math.min(baseRetryMs * Math.min(attempt, 6), maxRetryMs);
      console.error(`[MongoDB] Connection attempt ${attempt} failed: ${redactMongoUri(err.message)}`);
      console.warn(`[MongoDB] Retrying in ${Math.round(delay / 1000)}s. Auth endpoints return HTTP 503 until connected.`);
      setTimeout(attemptConnect, delay);
    }
  };

  await attemptConnect();
};

module.exports = { validateMongoUri, redactMongoUri, connectMongo, configureSrvDns, ATLAS_SETUP_HINT };
