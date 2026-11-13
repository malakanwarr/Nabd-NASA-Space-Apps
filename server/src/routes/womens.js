// Women's health routes (owner: Layal). PRIVATE data: only the crew member herself sees this.
//   GET  /api/womens/cycle?crewId=sara -> { data: <data/womens-health.json>, logs: [saved logs, newest first] }
//   POST /api/womens/log  { crewId, date, area, symptoms, strength, notes } -> the saved log
//   DELETE /api/womens/log/:id?crewId=sara -> { ok: true, id } (Undo; only her own logs)
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import CycleLog from '../models/CycleLog.js';

const router = Router();
const dataFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/womens-health.json');

const NO_DB = 'Saving is not available right now: the database is not connected.';

function dbReady() {
  return mongoose.connection.readyState === 1;
}

function validCrewId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,40}$/.test(id);
}

function shortText(value, max) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

router.get('/', (req, res) => res.json({ ok: true, feature: 'womens' }));

router.get('/cycle', async (req, res) => {
  const { crewId } = req.query;
  if (!validCrewId(crewId)) return res.status(400).json({ error: 'crewId is missing.' });

  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  // Without a database the screen still works; there are just no saved logs yet.
  const logs = dbReady()
    ? await CycleLog.find({ crewId }).sort({ _id: -1 }).limit(50).select('-__v').lean()
    : [];
  res.json({ data, logs });
});

router.post('/log', async (req, res) => {
  const { crewId, date, area, symptoms, strength, notes } = req.body || {};

  if (!validCrewId(crewId)) return res.status(400).json({ error: 'crewId is missing.' });
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must look like 2026-11-13.' });
  }
  if (!shortText(area, 40)) return res.status(400).json({ error: 'Pick a body area.' });
  if (
    !Array.isArray(symptoms) ||
    symptoms.length === 0 ||
    symptoms.length > 10 ||
    !symptoms.every((x) => shortText(x, 60))
  ) {
    return res.status(400).json({ error: 'Pick at least one symptom.' });
  }
  if (strength !== undefined && strength !== null && !(Number.isInteger(strength) && strength >= 1 && strength <= 10)) {
    return res.status(400).json({ error: 'strength must be a whole number from 1 to 10.' });
  }
  if (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > 300)) {
    return res.status(400).json({ error: 'notes must be 300 characters or fewer.' });
  }
  if (!dbReady()) return res.status(503).json({ error: NO_DB });

  const log = await CycleLog.create({
    crewId,
    date,
    area: area.trim(),
    symptoms: symptoms.map((x) => x.trim()),
    strength: strength ?? undefined,
    notes: notes ? notes.trim() : '',
  });
  const saved = log.toObject();
  delete saved.__v;
  res.status(201).json(saved);
});

router.delete('/log/:id', async (req, res) => {
  const { crewId } = req.query;
  const { id } = req.params;
  if (!validCrewId(crewId)) return res.status(400).json({ error: 'crewId is missing.' });
  if (!dbReady()) return res.status(503).json({ error: 'Undo is not available right now: the database is not connected.' });
  if (!mongoose.isValidObjectId(id)) return res.status(404).json({ error: 'That log was not found.' });

  // Matching on crewId too, so nobody can delete someone else's log.
  const deleted = await CycleLog.findOneAndDelete({ _id: id, crewId });
  if (!deleted) return res.status(404).json({ error: 'That log was not found.' });
  res.json({ ok: true, id });
});

export default router;
