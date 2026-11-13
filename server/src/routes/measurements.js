// measurements routes (owner: Layal). Placeholder: replace the TODOs with real code.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'measurements' }));

// TODO: POST / with { type, value, unit, fasting, takenAt } -> the reading with { status, advice }
// TODO: GET /?type= recent readings

export default router;
