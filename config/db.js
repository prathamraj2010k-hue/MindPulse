import mongoose from 'mongoose';

/**
 * Connect to MongoDB.
 * Reads MONGODB_URI from environment, falls back to local.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindpulse';

  mongoose.connection.on('connected', () => {
    console.log('✅  MongoDB connected:', uri.replace(/\/\/.*@/, '//***:***@'));
  });
  mongoose.connection.on('error', (err) => {
    console.error('❌  MongoDB error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    console.error('   The server will still run, but database features will not work.');
    console.error('   To fix: install MongoDB locally or use MongoDB Atlas (free).');
  }
}
