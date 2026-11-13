// Vercel serverless function: every /api/* request comes here (see vercel.json).
// It runs the same Express app as `npm run dev`; the routes are not changed.
import app from '../server/src/app.js';
import { connectDb } from '../server/src/db.js';

export default async function handler(req, res) {
  await connectDb(); // reuses the open connection when the function is warm
  return app(req, res);
}
