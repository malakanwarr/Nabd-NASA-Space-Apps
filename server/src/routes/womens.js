// womens routes (owner: Layal). Placeholder: replace the TODOs with real code.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'womens' }));

// TODO: GET /cycle
// TODO: POST /log with { date, area, symptoms, strength, notes }

export default router;
