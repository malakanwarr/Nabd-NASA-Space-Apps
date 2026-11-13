// Database connection (Malak only). If MongoDB is missing or fails, we warn and keep the server running.
import mongoose from 'mongoose';

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[db] MONGODB_URI is not set. Running WITHOUT a database (sample data still works).');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[db] Connected to MongoDB');
    return true;
  } catch (err) {
    console.warn('[db] Could not connect to MongoDB. Running WITHOUT a database:', err.message);
    return false;
  }
}
