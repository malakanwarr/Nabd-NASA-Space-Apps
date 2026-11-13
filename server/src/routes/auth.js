import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import Crew from '../models/Crew.js';

const router = Router();
const crewFile = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../data/crew.json',
);

async function findMember(crewId) {
  const fromFile = JSON.parse(fs.readFileSync(crewFile, 'utf8')).crew.find((c) => c.id === crewId);
  if (fromFile)
    return { id: fromFile.id, name: fromFile.name, role: fromFile.role, pin: fromFile.demoPin };
  if (mongoose.connection.readyState === 1) {
    const c = await Crew.findOne({ id: crewId }).lean(); // members added in Mission Control
    if (c) return { id: c.id, name: c.name, role: c.role, pin: c.pin };
  }
  return null;
}

router.get('/', (req, res) => res.json({ ok: true, feature: 'auth' }));

router.post('/admin', (req, res) => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD)
    return res.status(503).json({ error: 'Admin sign-in is not configured' });

  const email = req.body?.email;
  const password = req.body?.password;
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password)
    return res.status(400).json({ error: 'email and password are required' });

  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Invalid email or password' });

  return res.json({ id: 'admin', name: 'Mission Control admin', role: 'admin' });
});

router.post('/crew', async (req, res) => {
  const crewId = String(req.body?.crewId ?? '');
  const pin = String(req.body?.pin ?? '');
  if (!crewId || !/^\d{4}$/.test(pin))
    return res.status(400).json({ error: 'crewId and a 4-digit pin are required' });
  try {
    const member = await findMember(crewId);
    if (!member || member.pin !== pin) return res.status(401).json({ error: 'Wrong PIN' });
    return res.json({ id: member.id, name: member.name, role: member.role });
  } catch {
    return res.status(500).json({ error: 'sign-in failed' });
  }
});

export default router;
