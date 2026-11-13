import express, { Router } from 'express';
import mongoose from 'mongoose';
import FamilyMessage from '../models/FamilyMessage.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const MAX_MESSAGE_SECONDS = 60;

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

function messageJson(message) {
  const id = String(message._id);
  return {
    id,
    crewId: message.crewId,
    mimeType: message.mimeType,
    durationSeconds: message.durationSeconds,
    createdAt: new Date(message.createdAt).toISOString(),
    audioUrl: `/api/family/messages/${encodeURIComponent(id)}/audio`,
  };
}

// Helper to find the data folder (adjust path if your data folder is elsewhere)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../../data/crew.json');

const getFamilyData = () => {
  try {
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return data.familyCircle || { members: [], joinCode: '' };
    }
  } catch (err) {
    console.error('Error reading family data:', err);
  }
  // Fallback data if file is missing
  return {
    astronautId: 'sara',
    joinCode: '482913',
    members: ['Omar', 'Laila', 'Mona'],
  };
};

// 1. Base route check (Matches the pattern of other routes)
router.get('/', (req, res) => {
  res.json({ ok: true, feature: 'family' });
});

// 2. GET /api/family/circle -> Returns the family circle for the current user
router.get('/circle', (req, res) => {
  try {
    const familyData = getFamilyData();
    return res.json(familyData);
  } catch (err) {
    console.error('Family circle error:', err);
    return res.status(500).json({ error: 'could not load family circle' });
  }
});

router.post(
  '/messages',
  express.raw({ type: 'audio/*', limit: '8mb' }),
  async (req, res) => {
    const crewId = String(req.query.crewId || '').trim();
    const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const durationSeconds = Number(req.headers['x-duration-seconds']);

    if (!crewId) return res.status(400).json({ error: 'crewId is required' });
    if (!mimeType.startsWith('audio/')) return res.status(415).json({ error: 'An audio recording is required' });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'The audio recording is empty' });
    }
    if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > MAX_MESSAGE_SECONDS) {
      return res.status(400).json({ error: `duration must be from 1 to ${MAX_MESSAGE_SECONDS} seconds` });
    }

    if (!isDatabaseConnected()) {
      return res.status(503).json({ error: 'The database is unavailable. The recording was not saved.' });
    }

    try {
      const savedMessage = await FamilyMessage.create({
        crewId,
        mimeType,
        durationSeconds,
        audio: req.body,
      });
      return res.status(201).json({ message: messageJson(savedMessage) });
    } catch (error) {
      console.error('Family voice message save error:', error);
      return res.status(500).json({ error: 'Could not save the voice message' });
    }
  },
);

router.get('/messages', async (req, res) => {
  const crewId = String(req.query.crewId || '').trim();
  if (!crewId) return res.status(400).json({ error: 'crewId is required' });
  if (!isDatabaseConnected()) {
    return res.status(503).json({ error: 'Voice messages are unavailable while the database is disconnected.' });
  }

  try {
    const messages = await FamilyMessage.find({ crewId }).sort({ createdAt: -1 }).limit(50);
    return res.json({ messages: messages.map(messageJson) });
  } catch (error) {
    console.error('Family voice message load error:', error);
    return res.status(500).json({ error: 'Could not load voice messages' });
  }
});

router.get('/messages/:id/audio', async (req, res) => {
  const id = String(req.params.id);
  if (!isDatabaseConnected()) {
    return res.status(503).json({ error: 'Voice messages are unavailable while the database is disconnected.' });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Voice message not found' });
  }

  try {
    const message = await FamilyMessage.findById(id).select('mimeType audio');
    if (!message) return res.status(404).json({ error: 'Voice message not found' });

    res.set('Content-Type', message.mimeType);
    res.set('Cache-Control', 'private, no-store');
    return res.send(message.audio);
  } catch (error) {
    console.error('Family voice message playback error:', error);
    return res.status(500).json({ error: 'Could not load the voice message' });
  }
});

// ⚠️ CRITICAL: Must be at the very bottom
export default router;
