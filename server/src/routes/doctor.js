// doctor routes (owner: Hana Haytham). Placeholder: replace the TODOs with real code.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'doctor' }));

// TODO: POST /chat: build context (doctor/buildContext.js)
// TODO: check red flags first (doctor/redFlags.js)
// TODO: call Gemini with a 15 s timeout, fall back to saved demo answers
// TODO: return { reply, redFlag, source }

export default router;
