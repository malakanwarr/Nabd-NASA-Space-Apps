// family routes (owner: Hana Sakr (stretch)). Placeholder: replace the TODOs with real code.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'family' }));

// TODO: POST /join with { code, name }

export default router;
