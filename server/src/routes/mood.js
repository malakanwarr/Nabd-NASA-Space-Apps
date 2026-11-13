// mood routes (owner: Malak).
//   POST /api/mood   saves one check-in { face, voice, context, energyScore, label, reactionMs }
//   GET  /api/mood   returns the last 7 check-ins, oldest first (the order the chart draws them)
//   GET  /api/mood/experiment   every check-in saved by a fatigue-experiment test id (exp-...)
//
// Fatigue experiment: test ids start with "exp-" (for example exp-malak). Their check-ins are
// saved under that id, each as its own entry (round 1 and round 2 on the same mission day are
// both kept), and they are only ever returned by their own id or by /experiment, so they never
// mix with Sara's data or the demo crew's.
//
// The demo must never show a blank chart, so if MongoDB is not connected the six sample days
// from data/mood-checkins.json are used and anything saved this session is kept in memory.
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import MoodCheckin from '../models/MoodCheckin.js';

const router = Router();
const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data');

const DEFAULT_CREW_ID = 'sara';
const HOW_MANY = 7;

const EXPERIMENT_PREFIX = 'exp-';

// A crew id is a short plain word. Anything else (an object, a very long string) is refused,
// so it can never end up inside a database query.
const CREW_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

function isExperiment(crewId) {
  return crewId.startsWith(EXPERIMENT_PREFIX);
}

// Check-ins saved while there is no database. They disappear when the server restarts.
const savedWithoutDb = [];

function hasDb() {
  return mongoose.connection.readyState === 1;
}

function readJson(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), 'utf8'));
  } catch {
    return null;
  }
}

// Today on the mission, from data/mission.json.
function missionToday() {
  const mission = readJson('mission');
  const today = (mission && mission.today) || {};
  return {
    missionDay: today.missionDay || 1,
    date: today.date || new Date().toISOString().slice(0, 10),
  };
}

// The six sample days, so the chart has a history before anyone checks in.
function sampleCheckins() {
  const file = readJson('mood-checkins');
  const list = (file && file.checkins) || [];
  return list.map((c) => ({ ...c, crewId: DEFAULT_CREW_ID }));
}

// Only the fields we promised to keep. Nothing of the sound or the words is saved.
function cleanCheckin(body) {
  const today = missionToday();
  const face = body.face || null;
  const voice = body.voice || null;
  return {
    crewId: body.crewId ? String(body.crewId).toLowerCase() : DEFAULT_CREW_ID,
    missionDay: Number.isFinite(body.missionDay) ? body.missionDay : today.missionDay,
    date: body.date || today.date,
    face: face && {
      blinksPerMin: face.blinksPerMin,
      eyeOpenness: face.eyeOpenness,
      smileRate: face.smileRate,
    },
    voice: voice && {
      pitchRangeHz: voice.pitchRangeHz,
      loudness: voice.loudness,
      pauseRatio: voice.pauseRatio,
      paceSegmentsPerSec: voice.paceSegmentsPerSec,
    },
    context: body.context || {},
    reactionMs: body.reactionMs ?? null,
    energyScore: body.energyScore ?? null,
    label: body.label || null,
    time: new Date(),
  };
}

// Mission day first, then the time it was saved (sample days have no time and keep their order).
function byDayThenTime(a, b) {
  if (a.missionDay !== b.missionDay) return (a.missionDay || 0) - (b.missionDay || 0);
  return (new Date(a.time || 0).getTime() || 0) - (new Date(b.time || 0).getTime() || 0);
}

// One entry per mission day, the latest. Normal crew only ever have one a day. An experiment id
// can have several (round 1, round 2), and the chart wants a single point for each day.
function latestPerDay(rows) {
  const byDay = new Map();
  [...rows].sort(byDayThenTime).forEach((c) => byDay.set(c.missionDay, c));
  return [...byDay.values()];
}

// POST /api/mood: save today's check-in.
router.post('/', async (req, res) => {
  const body = req.body || {};
  if (
    body.crewId !== undefined &&
    (typeof body.crewId !== 'string' || !CREW_ID_PATTERN.test(body.crewId.toLowerCase()))
  ) {
    return res.status(400).json({ error: 'crewId must be a short id like sara or exp-malak.' });
  }
  const checkin = cleanCheckin(body);
  if (checkin.energyScore === null) {
    return res.status(400).json({ error: 'A check-in needs an energyScore.' });
  }
  const experiment = isExperiment(checkin.crewId);
  try {
    if (hasDb()) {
      // Experiment: always a new entry, so every round is kept.
      if (experiment) {
        const created = await MoodCheckin.create(checkin);
        return res.status(201).json(created.toObject());
      }
      // Everyone else: one check-in per crew member per mission day, a repeat replaces the earlier one.
      const saved = await MoodCheckin.findOneAndUpdate(
        { crewId: checkin.crewId, missionDay: checkin.missionDay },
        checkin,
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean();
      return res.status(201).json(saved);
    }
    const same = experiment
      ? -1
      : savedWithoutDb.findIndex(
          (c) => c.crewId === checkin.crewId && c.missionDay === checkin.missionDay,
        );
    if (same >= 0) savedWithoutDb[same] = checkin;
    else savedWithoutDb.push(checkin);
    return res.status(201).json(checkin);
  } catch (err) {
    console.error('[mood] could not save the check-in:', err.message);
    return res.status(500).json({ error: 'Could not save the check-in.' });
  }
});

// GET /api/mood: the last 7 days, oldest first, one check-in a day. ?crewId=sara to pick a crew member.
router.get('/', async (req, res) => {
  const wanted = req.query.crewId === undefined ? DEFAULT_CREW_ID : req.query.crewId;
  if (typeof wanted !== 'string' || !CREW_ID_PATTERN.test(wanted.toLowerCase())) {
    return res.status(400).json({ error: 'crewId must be a short id like sara or exp-malak.' });
  }
  const crewId = wanted.toLowerCase();
  try {
    if (hasDb()) {
      const rows = await MoodCheckin.find({ crewId })
        .sort({ missionDay: -1, time: -1 })
        .limit(50)
        .lean();
      if (rows.length) return res.json(latestPerDay(rows).slice(-HOW_MANY));
    }
    // No database, or an empty one: the six sample days plus anything saved this session.
    const mine = savedWithoutDb.filter((c) => c.crewId === crewId);
    const all = [...sampleCheckins().filter((c) => c.crewId === crewId), ...mine];
    return res.json(latestPerDay(all).slice(-HOW_MANY));
  } catch (err) {
    console.error('[mood] could not read the check-ins:', err.message);
    return res.status(500).json({ error: 'Could not read the check-ins.' });
  }
});

// The face and voice numbers as the experiment sheet wants them: every field always present.
function faceNumbers(face) {
  const f = face || {};
  return {
    blinksPerMin: f.blinksPerMin ?? null,
    eyeOpenness: f.eyeOpenness ?? null,
    smileRate: f.smileRate ?? null,
  };
}
function voiceNumbers(voice) {
  const v = voice || {};
  return {
    pitchRangeHz: v.pitchRangeHz ?? null,
    loudness: v.loudness ?? null,
    pauseRatio: v.pauseRatio ?? null,
    paceSegmentsPerSec: v.paceSegmentsPerSec ?? null,
  };
}

// GET /api/mood/experiment: every check-in saved by an exp- test id, sorted by person, then time.
// Only exp- ids are ever returned here, never Sara's or the demo crew's check-ins.
router.get('/experiment', async (req, res) => {
  try {
    const rows = hasDb()
      ? await MoodCheckin.find({ crewId: new RegExp(`^${EXPERIMENT_PREFIX}`) }).lean()
      : savedWithoutDb.filter((c) => isExperiment(c.crewId));
    const list = rows
      .map((c) => ({
        crewId: c.crewId,
        time: c.time ? new Date(c.time).toISOString() : null,
        energyScore: c.energyScore ?? null,
        label: c.label ?? null,
        face: faceNumbers(c.face),
        voice: voiceNumbers(c.voice),
        reactionMs: c.reactionMs ?? null,
      }))
      .sort((a, b) => a.crewId.localeCompare(b.crewId) || String(a.time).localeCompare(String(b.time)));
    return res.json(list);
  } catch (err) {
    console.error('[mood] could not read the experiment check-ins:', err.message);
    return res.status(500).json({ error: 'Could not read the experiment check-ins.' });
  }
});

export default router;
