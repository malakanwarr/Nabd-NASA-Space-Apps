// Read-only sample data (Malak only): GET /api/data/:name returns data/<name>.json from the repo.
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();
const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data');

router.get('/:name', (req, res) => {
  const name = req.params.name;
  // Only plain names (letters, numbers, dashes, underscores) so nobody can escape the data folder.
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return res.status(404).json({ error: 'Not found' });
  const file = path.join(dataDir, `${name}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.type('application/json').send(fs.readFileSync(file, 'utf8'));
});

export default router;
