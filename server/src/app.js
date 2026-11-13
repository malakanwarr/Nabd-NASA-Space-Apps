// The Express app with ALL routes mounted (Malak only). It does not listen and does not connect to the
// database: index.js does that for local development and api/index.mjs does it on Vercel.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
// CLIENT_ORIGIN may list several origins, separated by commas. On Vercel the client and the API share
// one domain, so the browser does not need CORS there; it is only for other origins you allow.
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: origins.length === 1 ? origins[0] : origins }));

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

export default app;
