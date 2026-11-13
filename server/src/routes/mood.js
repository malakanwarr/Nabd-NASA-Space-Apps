// mood routes (owner: Malak). Placeholder: replace the TODOs with real code.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'mood' }));

// TODO: POST / save a check-in
// TODO: GET / last 7 check-ins

export default router;
