// admin routes (owner: Salma). Placeholder: replace the TODOs with real code.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ ok: true, feature: 'admin' }));

// TODO: POST /signin with { email, password } checked against ADMIN_EMAIL and ADMIN_PASSWORD

export default router;
