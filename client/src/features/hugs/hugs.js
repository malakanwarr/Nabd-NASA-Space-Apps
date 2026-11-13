import { Router } from 'express';
import mongoose from 'mongoose';
import Hug from '../models/Hug.js';

const router = Router();
const memory = []; // In-memory fallback when MongoDB is not connected

const dbUp = () => mongoose.connection.readyState === 1;

const toJson = (h) => ({
  id: String(h._id ?? h.id),
  from: h.from,
  to: h.to,
  createdAt: new Date(h.createdAt).toISOString(),
});

// 1. Base route check
router.get('/', (req, res) => res.json({ ok: true, feature: 'hugs' }));

// 2. POST /api/hugs
router.post('/', async (req, res) => {
  const from = String(req.body?.from ?? '').trim();
  if (!from) return res.status(400).json({ error: 'from is required' });

  try {
    let hug;
    if (dbUp()) {
      hug = await Hug.create({ from, to: 'sara' });
    } else {
      hug = { id: String(memory.length + 1), from, to: 'sara', createdAt: new Date() };
      memory.push(hug);
    }
    return res.status(201).json(toJson(hug));
  } catch (err) {
    console.error('Hug save error:', err);
    return res.status(500).json({ error: 'could not save hug' });
  }
});

// 3. GET /api/hugs/new
router.get('/new', async (req, res) => {
  const since = new Date(String(req.query.since ?? ''));
  if (Number.isNaN(since.getTime())) {
    return res.status(400).json({ error: 'since must be an ISO date' });
  }

  try {
    const hugs = dbUp()
      ? await Hug.find({ to: 'sara', createdAt: { $gt: since } })
          .sort({ createdAt: 1 })
          .limit(20)
      : memory.filter((h) => new Date(h.createdAt) > since).slice(0, 20);

    return res.json(hugs.map(toJson));
  } catch (err) {
    console.error('Hug load error:', err);
    return res.status(500).json({ error: 'could not load hugs' });
  }
});

// ⚠️ CRITICAL: This line MUST be at the very bottom
export default router;
