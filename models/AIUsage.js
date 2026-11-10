import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  endpoint: { type: String, enum: ['chat', 'quiz', 'lesson'], required: true },
  prompt:   { type: String, maxlength: 5000 },
  success:  { type: Boolean, default: true },
  error:    { type: String },
  tokensUsed: { type: Number, default: 0 },
}, { timestamps: true });

// Index for quick analytics queries
aiUsageSchema.index({ createdAt: -1 });
aiUsageSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('AIUsage', aiUsageSchema);
