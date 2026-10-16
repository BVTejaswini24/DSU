# CarbonIQ 🌱

> AI-powered sustainability platform designed to help users explore environmental insights and make informed, sustainable decisions.

**A Hackathon Project**

---

## 📖 About

CarbonIQ is an AI-powered sustainability platform that combines interactive dashboards, intelligent recommendations, and simulation tools to make environmental insights more accessible.

The platform integrates AI assistance and data-driven features to help users explore sustainability-related information through a simple, interactive interface.

🌐 **Live Website:** https://carboniq-demo.vercel.app

---

## ✨ Features

- 🤖 **AI Coach** — AI-powered assistance and sustainability guidance.
- 📊 **Interactive Dashboard** — Explore sustainability metrics and insights.
- 🎫 **Ticket Scanner** — Scan tickets using the integrated scanning feature.
- 🔮 **What-If Simulator** — Explore hypothetical scenarios.
- 💡 **Smart Suggestions** — Access sustainability-related recommendations.
- 🔐 **User Authentication** — Login and user access.
- ⚡ **Real-Time Communication** — Socket.IO integration for supported features.

---

## 🛠 Tech Stack

### Frontend
- React
- Vite
- TypeScript

### Backend
- Node.js
- Express.js

### Database
- MongoDB Atlas

### AI Integration
- Groq API
- Google Gemini API

### Real-Time Communication
- Socket.IO

### Deployment
- Vercel — Frontend
- Render — Backend

---

## 🏗 System Architecture

```text
Frontend (Vercel)
       |
       v
Backend API (Render)
       |
       ├── MongoDB Atlas
       ├── Groq API
       ├── Google Gemini API
       └── Socket.IO
