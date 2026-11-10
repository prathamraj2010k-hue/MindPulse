import express from 'express';
import AIUsage from '../models/AIUsage.js';

const router = express.Router();

// ============================================================
//  AI Configuration (keys live ONLY on the server — never sent
//  to the browser. This is the secure way to use AI in a web app.)
// ============================================================
const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;
const GEMINI_MODEL    = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const OPENAI_API_KEY  = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL    = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function aiAvailable() {
  return !!(GEMINI_API_KEY || OPENAI_API_KEY);
}

// ---------- Low-level AI callers ----------
async function callGemini(prompt, system) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: (system || '') + '\n\n' + prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)';
}

async function callOpenAI(prompt, system) {
  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system || 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '(no response)';
}

async function callAI(prompt, system) {
  if (GEMINI_API_KEY) return callGemini(prompt, system);
  if (OPENAI_API_KEY) return callOpenAI(prompt, system);
  throw new Error('No AI API key configured on the server. Set GEMINI_API_KEY or OPENAI_API_KEY in .env');
}

// Helper: extract JSON from an AI response that may have stray text or markdown
function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1) {
    throw new Error('No JSON found in AI response: ' + cleaned.slice(0, 200));
  }
  return JSON.parse(cleaned.slice(first, last + 1));
}

// Helper: log usage (non-blocking, never throws)
function logUsage(userId, endpoint, prompt, success, error) {
  AIUsage.create({ userId, endpoint, prompt: prompt?.slice(0, 1000), success, error: error?.slice(0, 500) })
    .catch(() => {});
}

// ============================================================
//  Routes
// ============================================================

// POST /api/ai/chat  — AI Tutor chat
router.post('/chat', async (req, res) => {
  const { message, context, userId } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  if (!aiAvailable()) return res.status(503).json({ error: 'AI not configured on server. Set GEMINI_API_KEY in .env' });

  const sys = `The student is in the ${context || 'general'} section of MindPulse, an interactive STEM learning app with Physics, Chemistry, and Biology virtual labs. Keep answers short (3-5 sentences) unless asked for detail. Use simple language a curious beginner can understand. Use **bold** for key terms.`;

  try {
    const reply = await callAI(message, sys);
    logUsage(userId, 'chat', message, true);
    res.json({ reply });
  } catch (err) {
    logUsage(userId, 'chat', message, false, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/quiz  — Generate a fresh quiz question (Biology Lab)
router.post('/quiz', async (req, res) => {
  const { part, animal, userId } = req.body;
  if (!part || !animal) return res.status(400).json({ error: 'part and animal are required' });
  if (!aiAvailable()) return res.status(503).json({ error: 'AI not configured on server' });

  const prompt = `Generate ONE multiple-choice quiz question about the "${part}" of a ${animal}. The question should be educational and suitable for a curious beginner. Return JSON in this exact format: {"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}`;
  const sys = 'You are a STEM quiz generator. Always return valid JSON only — no markdown, no code fences.';

  try {
    const raw = await callAI(prompt, sys);
    const json = extractJSON(raw);
    logUsage(userId, 'quiz', prompt, true);
    res.json(json);
  } catch (err) {
    logUsage(userId, 'quiz', prompt, false, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/lesson  — Generate a full lesson (AI Study Buddy)
router.post('/lesson', async (req, res) => {
  const { topic, userId } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  if (!aiAvailable()) return res.status(503).json({ error: 'AI not configured on server' });

  const prompt = `Create a learning module on the topic: "${topic}".
Return JSON in this exact format:
{
  "title": "short catchy title",
  "difficulty": "Easy/Medium/Hard",
  "readTime": "X min",
  "lesson": ["paragraph 1...", "paragraph 2...", "paragraph 3..."],
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "flashcards": [{"front":"question","back":"answer"}, ...5 cards],
  "quiz": [{"question":"...","options":["a","b","c","d"],"correct":0}, ...3 questions]
}
Make content accurate, beginner-friendly, and engaging. The lesson should have 3 short paragraphs. Always provide exactly 5 flashcards and 3 quiz questions.`;
  const sys = 'You are an expert STEM educator. Always return valid JSON only — no markdown, no code fences.';

  try {
    const raw = await callAI(prompt, sys);
    const json = extractJSON(raw);
    logUsage(userId, 'lesson', prompt, true);
    res.json(json);
  } catch (err) {
    logUsage(userId, 'lesson', prompt, false, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/status  — Check if AI is configured (no keys exposed)
router.get('/status', (req, res) => {
  res.json({
    available: aiAvailable(),
    provider: GEMINI_API_KEY ? 'gemini' : (OPENAI_API_KEY ? 'openai' : null),
    model: GEMINI_API_KEY ? GEMINI_MODEL : (OPENAI_API_KEY ? OPENAI_MODEL : null),
  });
});

export default router;
