// Seed script (owner: Malak): puts the demo data into MongoDB.
//   npm run seed --prefix server
// Loads the four crew members from data/crew.json (demoPin is saved as pin) and the six
// sample check-ins from data/mood-checkins.json. Running it again replaces what is there.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDb } from './db.js';
import Crew from './models/Crew.js';
import MoodCheckin from './models/MoodCheckin.js';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), 'utf8'));
}

const connected = await connectDb();
if (!connected) {
  console.error('Seed stopped: no database. Set MONGODB_URI in server/.env and try again.');
  process.exit(1);
}

// The crew: data/crew.json calls the demo PIN "demoPin", the model calls it "pin".
const crewFile = readJson('crew');
const crew = (crewFile.crew || []).map((member) => ({
  id: member.id,
  name: member.name,
  role: member.role,
  mission: (crewFile.mission && crewFile.mission.name) || undefined,
  birthDate: member.birthDate,
  allergies: member.allergies || [],
  surgeon: (crewFile.mission && crewFile.mission.flightSurgeon) || undefined,
  pin: member.demoPin,
}));

await Crew.deleteMany({});
await Crew.insertMany(crew);
console.log(`Crew: ${crew.length} saved (${crew.map((c) => c.id).join(', ')}).`);

// The six sample check-ins, all Sara's.
const moodFile = readJson('mood-checkins');
const checkins = (moodFile.checkins || []).map((c) => ({ crewId: 'sara', ...c }));

await MoodCheckin.deleteMany({});
await MoodCheckin.insertMany(checkins);
console.log(
  `Mood check-ins: ${checkins.length} saved (days ${checkins.map((c) => c.missionDay).join(', ')}).`,
);

await mongoose.disconnect();
console.log('Seed finished.');
