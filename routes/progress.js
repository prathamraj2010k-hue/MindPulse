import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// ============================================================
//  Progress Routes — user XP, level, bio/chem discoveries
//  Uses MongoDB to persist progress across devices/sessions.
//  The frontend also keeps a localStorage cache for offline use.
// ============================================================

// POST /api/progress  — Create a new guest user
router.post('/', async (req, res) => {
  try {
    const user = await User.create({ name: req.body?.name || 'Guest' });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/progress/:userId  — Get a user's progress (create if missing)
router.get('/:userId', async (req, res) => {
  try {
    let user = await User.findById(req.params.userId);
    if (!user) {
      user = await User.create({ _id: req.params.userId });
    }
    res.json(user);
  } catch (err) {
    // If the ID is invalid (not a ObjectId), try creating by a different approach
    res.status(404).json({ error: 'User not found', details: err.message });
  }
});

// POST /api/progress/:userId/xp  — Add XP and increment run count
router.post('/:userId/xp', async (req, res) => {
  try {
    const { amount = 50, reason = '' } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $inc: { xp: amount, runs: 1 } },
      { new: true, upsert: true }
    );
    res.json({ user, reason });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/progress/:userId/bio/:animalId/:partId  — Mark a body part quiz as solved
router.post('/:userId/bio/:animalId/:partId', async (req, res) => {
  try {
    const { animalId, partId } = req.params;
    const key = `${animalId}_${partId}`;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        $set: { [`bioSolved.${key}`]: true },
        $inc: { xp: 50, runs: 1 },
      },
      { new: true, upsert: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/progress/:userId/chem/:reactionKey  — Mark a reaction as discovered
router.post('/:userId/chem/:reactionKey', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        $addToSet: { chemDiscovered: req.params.reactionKey },
        $inc: { xp: 50, runs: 1 },
      },
      { new: true, upsert: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/progress/leaderboard/top  — Top 10 users by XP (for hackathon fun!)
router.get('/leaderboard/top', async (req, res) => {
  try {
    const top = await User.find({ xp: { $gt: 0 } })
      .sort({ xp: -1 })
      .limit(10)
      .select('name xp runs level createdAt');
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
