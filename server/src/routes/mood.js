// mood routes (owner: Malak).
//   POST /api/mood   saves one check-in { face, voice, context, energyScore, label, reactionMs }
//   GET  /api/mood   returns the last 7 check-ins, oldest first (the order the chart draws them)
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
    crewId: body.crewId || DEFAULT_CREW_ID,
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
  };
}

function byDayThenDate(a, b) {
  if (a.missionDay !== b.missionDay) return (a.missionDay || 0) - (b.missionDay || 0);
  return String(a.date).localeCompare(String(b.date));
}

// POST /api/mood: save today's check-in.
router.post('/', async (req, res) => {
  const checkin = cleanCheckin(req.body || {});
  if (checkin.energyScore === null) {
    return res.status(400).json({ error: 'A check-in needs an energyScore.' });
  }
  try {
    if (hasDb()) {
      // One check-in per crew member per mission day: a repeat replaces the earlier one.
      const saved = await MoodCheckin.findOneAndUpdate(
        { crewId: checkin.crewId, missionDay: checkin.missionDay },
        checkin,
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean();
      return res.status(201).json(saved);
    }
    const same = savedWithoutDb.findIndex(
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

// GET /api/mood: the last 7 check-ins, oldest first. ?crewId=sara to pick a crew member.
router.get('/', async (req, res) => {
  const crewId = req.query.crewId || DEFAULT_CREW_ID;
  try {
    if (hasDb()) {
      const rows = await MoodCheckin.find({ crewId }).sort({ missionDay: -1 }).limit(HOW_MANY).lean();
      if (rows.length) return res.json(rows.sort(byDayThenDate));
    }
    // No database, or an empty one: the six sample days plus anything saved this session.
    const mine = savedWithoutDb.filter((c) => c.crewId === crewId);
    const all = [...sampleCheckins().filter((c) => c.crewId === crewId), ...mine];
    const byDay = new Map();
    all.forEach((c) => byDay.set(c.missionDay, c)); // a saved day replaces the sample day
    const list = [...byDay.values()].sort(byDayThenDate);
    return res.json(list.slice(-HOW_MANY));
  } catch (err) {
    console.error('[mood] could not read the check-ins:', err.message);
    return res.status(500).json({ error: 'Could not read the check-ins.' });
  }
});

export default router;
