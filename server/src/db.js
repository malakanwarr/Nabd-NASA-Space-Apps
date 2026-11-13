// Database connection (Malak only). If MongoDB is missing or fails, we warn and keep the server running.
// The connection is cached: asking again while it is open (or being opened) reuses it. On Vercel one
// warm function answers many requests, so this keeps us from opening a new connection every time.
import mongoose from 'mongoose';

const RETRY_AFTER_MS = 30_000; // after a failed connect, do not make every request wait for another try

let connecting = null; // the connect in progress, shared by everyone who asks meanwhile
let failedAt = 0;

async function connectOnce(uri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[db] Connected to MongoDB');
    return true;
  } catch (err) {
    console.warn('[db] Could not connect to MongoDB. Running WITHOUT a database:', err.message);
    failedAt = Date.now();
    return false;
  } finally {
    connecting = null;
  }
}

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[db] MONGODB_URI is not set. Running WITHOUT a database (sample data still works).');
    return false;
  }
  if (mongoose.connection.readyState === 1) return true; // already open
  if (connecting) return connecting; // already opening
  if (failedAt && Date.now() - failedAt < RETRY_AFTER_MS) return false;
  connecting = connectOnce(uri);
  return connecting;
}
