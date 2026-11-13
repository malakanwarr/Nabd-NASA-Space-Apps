// Pollen catch game routes (owner: Salma).
import { Router } from 'express';
import mongoose from 'mongoose';
import ReactionTest from '../models/ReactionTest.js';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'game' }));

router.post('/', async (req, res, next) => {
  const { averageMs, catches, misses } = req.body ?? {};
  const validAverage = averageMs === null || (Number.isFinite(averageMs) && averageMs >= 0);
  if (!validAverage || !Number.isInteger(catches) || catches < 0 || !Number.isInteger(misses) || misses < 0) {
    return res.status(400).json({ error: 'averageMs, catches and misses must be valid reaction results.' });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Game results cannot be saved because the database is unavailable.' });
  }

  try {
    const result = await ReactionTest.create({ averageMs, catches, misses });
    return res.status(201).json({
      result: {
        averageMs: result.averageMs,
        catches: result.catches,
        misses: result.misses,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
