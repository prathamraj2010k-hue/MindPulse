import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Guest users get a random UUID; logged-in users get an email
  name:     { type: String, default: 'Guest' },
  email:    { type: String, sparse: true, unique: true, lowercase: true },

  // Gamification
  xp:       { type: Number, default: 0 },
  runs:     { type: Number, default: 0 },

  // Per-lab progress
  bioSolved:       { type: Map, of: Boolean, default: {} },
  chemDiscovered:  { type: [String], default: [] },

  // AI usage tracking
  aiChats:   { type: Number, default: 0 },
  aiLessons: { type: Number, default: 0 },
}, { timestamps: true });

// Virtual: compute level from XP (200 XP per level)
userSchema.virtual('level').get(function () {
  return Math.floor(this.xp / 200) + 1;
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export default mongoose.model('User', userSchema);
