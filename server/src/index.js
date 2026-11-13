// Server entry point (Malak only). Mounts ALL routes so nobody edits this file later.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDb } from './db.js';
import dataRouter from './routes/data.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import crewRouter from './routes/crew.js';
import moodRouter from './routes/mood.js';
import doctorRouter from './routes/doctor.js';
import surgeonRouter from './routes/surgeon.js';
import womensRouter from './routes/womens.js';
import measurementsRouter from './routes/measurements.js';
import hugsRouter from './routes/hugs.js';
import familyRouter from './routes/family.js';
import gameRouter from './routes/game.js';

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/data', dataRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/crew', crewRouter);
app.use('/api/mood', moodRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/surgeon', surgeonRouter);
app.use('/api/womens', womensRouter);
app.use('/api/measurements', measurementsRouter);
app.use('/api/hugs', hugsRouter);
app.use('/api/family', familyRouter);
app.use('/api/game', gameRouter);

await connectDb();

const port = process.env.PORT || 5050;
app.listen(port, () => console.log(`NABD server listening on http://localhost:${port}`));
