// Pollen catch game routes (owner: Salma).
import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import ReactionTest from '../models/ReactionTest.js';

const router = Router();
const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data');
const savedWithoutDb = [];

router.get('/', async (req, res, next) => {
  const { crewId } = req.query;
  if (typeof crewId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(crewId)) {
    return res.status(400).json({ error: 'A valid crewId is required.' });
  }

  try {
    const crewFile = JSON.parse(await readFile(path.join(dataDir, 'crew.json'), 'utf8'));
    const memberExists = crewFile.crew.some((crewMember) => crewMember.id === crewId);
    // Ids that are not in the crew list (test ids like exp-malak) have no history of their own here:
    // they get the general usual reaction time from data/baseline.json instead of an error.
    if (!memberExists) {
      const baseline = JSON.parse(await readFile(path.join(dataDir, 'baseline.json'), 'utf8'));
      return res.json({ history: [], usualMs: Number.isFinite(baseline.reactionTimeMs) ? baseline.reactionTimeMs : null });
    }

    const history = mongoose.connection.readyState === 1
      ? await ReactionTest.find({ crewId }).sort({ date: -1, _id: -1 }).limit(14).select('averageMs date').lean()
      : savedWithoutDb.filter((result) => result.crewId === crewId).slice(-14).reverse();

    return res.json({ history: history.map(({ averageMs, date }) => ({ averageMs, date })) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  const { crewId } = req.query;
  const { averageMs, catches, misses } = req.body ?? {};
  if (typeof crewId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(crewId)) {
    return res.status(400).json({ error: 'A valid crewId is required.' });
  }
  const validAverage = averageMs === null || (Number.isFinite(averageMs) && averageMs >= 0);
  if (!validAverage || !Number.isInteger(catches) || catches < 0 || !Number.isInteger(misses) || misses < 0) {
    return res.status(400).json({ error: 'averageMs, catches and misses must be valid reaction results.' });
  }

  try {
    const result = {
      crewId,
      date: new Date().toISOString().slice(0, 10),
      averageMs,
      catches,
      misses,
    };
    if (mongoose.connection.readyState === 1) {
      await ReactionTest.create(result);
    } else {
      savedWithoutDb.push(result);
    }

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
