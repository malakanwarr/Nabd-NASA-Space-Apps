// crew routes (owner: Salma). Placeholder: replace the TODOs with real code.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'crew' }));

// TODO: GET / summaries only (never cycle, face, voice or doctor data)
// TODO: GET /:id
// TODO: POST / add a crew member

export default router;
