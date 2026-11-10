# ⚡ MindPulse AI — Backend

Multi-subject STEM learning platform with **Node.js + Express + MongoDB + AI proxy**.

The AI proxy is the key feature: your Gemini/OpenAI API key lives **only** on the server (in `.env`), so it's never exposed in the browser. The frontend calls `/api/ai/*` and the server forwards the request to the AI provider.

---

## 📁 Project Structure

```
mindpulse-backend/
├── server.js              # Express app entry point
├── package.json           # Dependencies & scripts
├── .env.example           # Copy to .env and fill in your keys
├── .gitignore
├── README.md              # This file
│
├── config/
│   └── db.js              # MongoDB connection logic
│
├── models/
│   ├── User.js            # User schema (XP, level, bio/chem progress)
│   └── AIUsage.js         # AI call logging (for analytics)
│
├── routes/
│   ├── progress.js        # User progress + leaderboard API
│   └── ai.js              # AI proxy (chat, quiz, lesson)
│
└── public/
    └── index.html         # MindPulse AI frontend (single-file app)
```

---

## 🚀 Quick Start (3 steps)

### Step 1: Install dependencies
```bash
cd mindpulse-backend
npm install
```

### Step 2: Set up environment variables
```bash
cp .env.example .env
```
Open `.env` in a text editor and fill in:
- **`MONGODB_URI`** — your MongoDB connection string (local or Atlas)
- **`GEMINI_API_KEY`** — free key from [aistudio.google.com](https://aistudio.google.com)

### Step 3: Run the server
```bash
npm start
```
Or with auto-reload during development:
```bash
npm run dev
```

Then open **http://localhost:3000** in your browser. That's it! 🎉

---

## 🗄️ MongoDB Setup (choose one)

### Option A: Local MongoDB (easiest)
1. Install MongoDB Community Edition: https://www.mongodb.com/try/download/community
2. Start it (it usually runs on port 27017 automatically)
3. Use the default URI: `mongodb://localhost:27017/mindpulse`

### Option B: MongoDB Atlas (free cloud — recommended for hackathons)
1. Sign up at https://www.mongodb.com/cloud/atlas/register (free tier)
2. Create a cluster → click "Connect" → "Drivers"
3. Copy the connection string (looks like `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/`)
4. Paste it as `MONGODB_URI` in your `.env`

---

## 🤖 AI Setup (choose one)

### Google Gemini (free, recommended)
1. Go to https://aistudio.google.com
2. Sign in with Google → click **"Get API key"** → **"Create API key"**
3. Copy the key → paste as `GEMINI_API_KEY` in `.env`

### OpenAI-compatible (Groq, OpenAI, etc.)
Uncomment the `OPENAI_*` lines in `.env` and fill them in.
- **Groq** (free, fast): https://console.groq.com → endpoint: `https://api.groq.com/openai/v1/chat/completions`
- **OpenAI**: https://platform.openai.com → endpoint: `https://api.openai.com/v1/chat/completions`

---

## 📡 API Endpoints

### Health & Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health (DB + AI status) |
| `GET` | `/api/ai/status` | AI provider info (no keys exposed) |

### AI Proxy (keys stay on server)
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/ai/chat` | `{message, context, userId?}` | AI Tutor chat |
| `POST` | `/api/ai/quiz` | `{part, animal, userId?}` | Generate quiz question |
| `POST` | `/api/ai/lesson` | `{topic, userId?}` | Generate full lesson + flashcards + quiz |

### User Progress
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/progress` | `{name?}` | Create new guest user |
| `GET` | `/api/progress/:userId` | — | Get user's XP & progress |
| `POST` | `/api/progress/:userId/xp` | `{amount, reason}` | Add XP |
| `POST` | `/api/progress/:userId/bio/:animalId/:partId` | — | Mark body part solved |
| `POST` | `/api/progress/:userId/chem/:reactionKey` | — | Mark reaction discovered |
| `GET` | `/api/progress/leaderboard/top` | — | Top 10 users by XP |

### Example: Generate a lesson via curl
```bash
curl -X POST http://localhost:3000/api/ai/lesson \
  -H "Content-Type: application/json" \
  -d '{"topic": "photosynthesis"}'
```

---

## 🔒 Why the AI Proxy?

**Without a backend (standalone HTML file):**
```
Browser → Gemini API (your API key is in the page source → anyone can steal it!)
```

**With this backend:**
```
Browser → /api/ai/chat → your server → Gemini API (key safe in .env)
```

Your API key never leaves the server. This is the **correct, secure way** to use AI in a web app.

---

## 🎯 How the Frontend Uses the Backend

The `public/index.html` frontend is smart — it works in **two modes**:

1. **Backend mode** (when served from `http://localhost:3000`):
   - Automatically detects the backend via `/api/health`
   - Uses `/api/ai/*` endpoints (no API key needed in the browser!)
   - The green dot on the 🤖 button shows "AI: Server Mode"

2. **Standalone mode** (when opening `index.html` directly as a file):
   - Falls back to direct Gemini calls with a user-provided key
   - Or shows demo-mode canned responses

This means you can develop with the backend, but the same file also works standalone for quick demos.

---

## 🛠️ Development Commands

```bash
npm start        # Start the server
npm run dev      # Start with nodemon (auto-reload on file changes)
```

---

## ❓ Troubleshooting

**"MongoDB connection failed"**
- Make sure MongoDB is running: `mongod` or check MongoDB service
- Or use MongoDB Atlas (cloud) instead of local

**"AI not configured"**
- Check your `.env` file has `GEMINI_API_KEY=your_key_here` (no quotes)
- Restart the server after editing `.env`

**"Port 3000 already in use"**
- Change `PORT=3001` in `.env`

**Frontend shows "Demo Mode" even with backend running**
- Open browser console (F12) and check for errors
- Visit `http://localhost:3000/api/health` — should return `{"status":"ok",...}`

---

## 📜 License

MIT — free to use for your hackathon, school project, or anything else. 🚀
