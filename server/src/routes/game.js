// game routes (owner: Salma). Placeholder: replace the TODOs with real code.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'game' }));

// TODO: POST / with { averageMs, catches, misses }
// TODO: GET / recent results

export default router;
