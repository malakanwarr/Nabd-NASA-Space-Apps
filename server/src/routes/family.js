import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

// Helper to find the data folder (adjust path if your data folder is elsewhere)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../../data/crew.json');

const getFamilyData = () => {
  try {
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return data.familyCircle || { members: [], joinCode: '' };
    }
  } catch (err) {
    console.error('Error reading family data:', err);
  }
  // Fallback data if file is missing
  return {
    astronautId: 'sara',
    joinCode: '482913',
    members: ['Omar', 'Laila', 'Mona'],
  };
};

// 1. Base route check (Matches the pattern of other routes)
router.get('/', (req, res) => {
  res.json({ ok: true, feature: 'family' });
});

// 2. GET /api/family/circle -> Returns the family circle for the current user
router.get('/circle', (req, res) => {
  try {
    const familyData = getFamilyData();
    return res.json(familyData);
  } catch (err) {
    console.error('Family circle error:', err);
    return res.status(500).json({ error: 'could not load family circle' });
  }
});

// ⚠️ CRITICAL: Must be at the very bottom
export default router;
