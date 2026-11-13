// hugs routes (owner: Hana Sakr). Placeholder: replace the TODOs with real code.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'hugs' }));

// TODO: POST / with { from }
// TODO: GET /new?since=<time>

export default router;
