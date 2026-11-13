// surgeon routes (owner: Hana Haytham (stretch)). Placeholder: replace the TODOs with real code.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'surgeon' }));

// TODO: GET /:crewId

export default router;
