// Measurement routes (owner: Layal).
//   POST /api/measurements { crewId, type, value, unit, fasting, takenAt } -> the saved reading with { status, advice }
//   GET  /api/measurements?type=bloodSugar&crewId=sara -> recent readings, newest first
// Ranges come from data/measurements.json. To add blood pressure later, add an entry to TYPES.
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import Measurement from '../models/Measurement.js';

const router = Router();
const dataFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/measurements.json');

const NO_DB = 'Saving is not available right now: the database is not connected.';

// Each type: allowed values, how a value falls into a band, band -> status, and the advice
// shown on the result screen (texts from the design board).
const TYPES = {
  bloodSugar: {
    min: 20,
    max: 400,
    band(value, fasting, d) {
      const r = fasting ? d.ranges.beforeMeal : d.ranges.afterMeal;
      if (value < r.low) return 'low';
      if (value <= r.normalHigh) return 'normal';
      if (value <= r.watchHigh) return 'high';
      return 'veryHigh';
    },
    status: { low: 'act', normal: 'stable', high: 'watch', veryHigh: 'act' },
    advice: {
      low: () =>
        'Your blood sugar is low. Take 15 g of fast sugar from the kit now, sit down, and measure again in 15 minutes.',
      normal: (d) => `Right in your normal range. Keep your meals and water on track; next check in ${d.everyDays} days.`,
      high: () =>
        'A little above your usual. Have water, take a 20-minute walk on the treadmill, and measure again tomorrow before breakfast.',
      veryHigh: () =>
        'Much higher than usual. Measure again in 15 minutes; if it stays high, tell Mei and the AI doctor now.',
    },
  },
};

function dbReady() {
  return mongoose.connection.readyState === 1;
}

function validCrewId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,40}$/.test(id);
}

router.get('/', async (req, res) => {
  const { type, crewId } = req.query;
  if (!validCrewId(crewId)) return res.status(400).json({ error: 'crewId is missing.' });
  if (type !== undefined && !TYPES[type]) return res.status(400).json({ error: 'Unknown measurement type.' });
  if (!dbReady()) return res.json([]);

  const filter = type ? { crewId, type } : { crewId };
  const readings = await Measurement.find(filter).sort({ takenAt: -1, _id: -1 }).limit(20).select('-__v').lean();
  res.json(readings);
});

router.post('/', async (req, res) => {
  const { crewId, type, value, fasting, takenAt } = req.body || {};
  const config = TYPES[type];

  if (!validCrewId(crewId)) return res.status(400).json({ error: 'crewId is missing.' });
  if (!config) return res.status(400).json({ error: 'Unknown measurement type.' });
  if (typeof value !== 'number' || !Number.isFinite(value) || value < config.min || value > config.max) {
    return res.status(400).json({ error: `Enter a number from ${config.min} to ${config.max}.` });
  }
  if (typeof fasting !== 'boolean') return res.status(400).json({ error: 'Say whether it was before a meal.' });
  const when = takenAt ? new Date(takenAt) : new Date();
  if (Number.isNaN(when.getTime())) return res.status(400).json({ error: 'takenAt is not a valid date.' });
  if (!dbReady()) return res.status(503).json({ error: NO_DB });

  const d = JSON.parse(fs.readFileSync(dataFile, 'utf8'))[type];
  const band = config.band(value, fasting, d);
  const saved = (
    await Measurement.create({
      crewId,
      type,
      value,
      unit: d.unit, // the unit always comes from the data file, not the phone
      fasting,
      takenAt: when,
      status: config.status[band],
      advice: config.advice[band](d),
    })
  ).toObject();
  delete saved.__v;
  res.status(201).json(saved);
});

export default router;
