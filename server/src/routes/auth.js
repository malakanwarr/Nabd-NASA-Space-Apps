// auth routes (owner: Hana Sakr). Placeholder: replace the TODOs with real code.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'auth' }));

// TODO: POST /crew with { crewId, pin } -> { id, name, role } or 401 (simulated sign-in)

export default router;
