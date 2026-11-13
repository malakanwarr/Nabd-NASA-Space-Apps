// Crew routes (owner: Salma). Mission Control responses contain summary fields only.
import { Router } from 'express';
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Crew from '../models/Crew.js';

const router = Router();
const sampleFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/crew.json');

async function loadCrew() {
  if (mongoose.connection.readyState === 1) {
    const savedCrew = await Crew.find().lean();
    if (savedCrew.length > 0) return { crew: savedCrew };
  }

  const sample = JSON.parse(await readFile(sampleFile, 'utf8'));
  if (!Array.isArray(sample.crew)) throw new Error('Crew sample data must contain a crew array.');
  return { crew: sample.crew, missionDate: sample.mission?.date };
}

function formatLastCheckIn(checkIn, missionDate) {
  if (typeof checkIn === 'string') return checkIn;
  if (!checkIn || typeof checkIn !== 'object') return '—';
  if (checkIn.missed) return 'Missed today';
  if (!checkIn.date) return '—';
  const date = checkIn.date === missionDate ? 'Today' : checkIn.date;
  return checkIn.time ? `${date}, ${checkIn.time}` : date;
}

function toSummary(member, missionDate) {
  const checkIn = member.lastCheckIn;
  const missedCheckIn = Boolean(checkIn && typeof checkIn === 'object' && checkIn.missed);
  const alerts = Array.isArray(member.alerts)
    ? member.alerts.map((alert) => typeof alert === 'string' ? alert : alert?.text || alert?.message).filter(Boolean)
    : [];
  const sleepAverage = member.sleepAvg7DaysHours ?? member.sleep7Days ?? member.sleepAverageHours;

  return {
    id: String(member.id || member._id || ''),
    name: member.name || '',
    role: member.role || '',
    status: member.status || 'unknown',
    readiness: member.readiness ?? null,
    lastCheckIn: formatLastCheckIn(checkIn, missionDate),
    checkInStatus: missedCheckIn ? 'missed' : checkIn ? 'checked-in' : member.checkInStatus,
    missedCheckIn,
    sleep7Days: sleepAverage == null ? '—' : `${sleepAverage} h`,
    alerts,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const { crew, missionDate } = await loadCrew();
    res.json({ crew: crew.map((member) => toSummary(member, missionDate)) });
  } catch (error) {
    next(error);
  }
});

export default router;
