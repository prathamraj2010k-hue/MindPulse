// ============================================================
//  MindPulse AI — Node.js Backend Server
//  Express + MongoDB + AI Proxy (Gemini / OpenAI)
// ============================================================
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import progressRoutes from './routes/progress.js';
import aiRoutes from './routes/ai.js';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ----- Middleware -----
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple request logger (helpful for hackathon demos)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next(); // skip static files
  console.log(`${new Date().toISOString()}  ${req.method}  ${req.path}`);
  next();
});

// ----- API Routes -----
app.use('/api/progress', progressRoutes);
app.use('/api/ai', aiRoutes);

// ----- Health check (frontend uses this to detect the backend) -----
app.get('/api/health', async (req, res) => {
  const mongoose = (await import('mongoose')).default;
  res.json({
    status: 'ok',
    server: true,
    db: mongoose.connection.readyState === 1, // 1 = connected
    ai: !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// ----- Serve static frontend -----
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback: serve index.html for any non-API route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----- Global error handler -----
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ----- Start server -----
async function start() {
  // Connect to MongoDB (non-blocking — server runs even if DB is down)
  await connectDB();

  app.listen(PORT, () => {
    console.log('');
    console.log('  ╔════════════════════════════════════════════════╗');
    console.log('  ║  ⚡  MindPulse AI Server                       ║');
    console.log('  ╠════════════════════════════════════════════════╣');
    console.log(`  ║  🚀  Server:   http://localhost:${PORT}            ║`);
    console.log(`  ║  📊  Health:   http://localhost:${PORT}/api/health ║`);
    console.log(`  ║  🤖  AI:       ${process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY ? '✅ configured' : '⚠️  not configured (add a key to .env)'}    ║`);
    console.log(`  ║  📦  MongoDB:  ${process.env.MONGODB_URI ? '✅ configured' : '⚠️  using local default'}    ║`);
    console.log('  ╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('  Press Ctrl+C to stop.');
    console.log('');
  });
}

start();
