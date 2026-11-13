# NABD: rules for AI coding agents

NABD is an astronaut health app for NASA Space Apps Cairo 2026: one React + Vite
mobile web app (PWA) in client/, with laptop pages for Mission Control and the
flight surgeon, and an Express + MongoDB server in server/.
The design canvas is the source of truth for how every screen looks.

## First, find out who you are helping
If the person has not said her name, ask: "Who are you on the team?"
Then work only in her folders below. If a task needs another person's folder,
stop and tell her who owns it.

| Name | Folders she owns |
| --- | --- |
| Habiba (Role 1) | client/src/features/mood-face/, profile/, home-window/ |
| Malak (Role 2, team lead) | client/src/shared/, mood-voice/, mood-results/, App.jsx, main.jsx, vite.config.js, server/src/index.js, db.js, routes/data.js, routes/mood.js, seed.js, all package.json files |
| Hana Haytham (Role 3) | features/ai-doctor/, body/, surgeon/, server/src/routes/doctor.js, routes/surgeon.js, server/src/doctor/ |
| Layal (Role 4) | features/womens-health/, measure/, avatar/, server/src/routes/womens.js, measurements.js, docs/ |
| Hana Sakr (Role 5) | features/home/, auth/, hugs/, family-app/, server/src/routes/auth.js, hugs.js, family.js |
| Salma (Role 6) | features/game/, garden/, admin/, server/src/routes/game.js, crew.js, admin.js, docs/ |

Models in server/src/models/ belong to the owner of the matching route.

## Hard rules
- Only edit files in the person's folders. Shared files belong to Malak; if a
  change is needed there, write it down for Malak instead.
- Never install packages. Only Malak adds them.
- Never put API keys in client code or commit .env.
- Use the shared components (TabBar, ScreenHeader, Button, StatusLabel,
  ListRow, Chip, StepProgress, Planet). Do not restyle them.
- Use only the CSS variables in shared/theme.css for color, spacing, corners
  and font size. Never write a hex color or a pixel size by hand. Every screen
  must work in both dark and light mode.
- Blue (--primary) is the main action, one per area. Red (--act) means danger only.
- Lists with dividers, not boxes. Cards only for items compared or opened one by one.
- Sara's numbers come from getSampleData('<file>'), never typed into a screen.
- Keep the API routes and field names exactly as in the team plan.
- Privacy: Mission Control sees status, check-ins, readiness and alerts only;
  the flight surgeon also sees medical details; family sees hugs and a simple
  status; only the crew member sees her cycle, face and voice details.
- Sign-in is simulated: use shared/session.js, never build real password storage.
- Every screen has loading, empty, error and success states; no blank screens.
- Pop-ups only for short confirmations; new information goes on its own page.
- Tap targets at least 44 px, readable text at least 14 px, a label on every
  icon-only button, status always shown as a word as well as a color.
- Animations are slow and soft and stop when prefers-reduced-motion is set.
- Plain English in the interface, sentence case. The AI doctor never diagnoses.
- JavaScript only (no TypeScript), function components and hooks, one screen per file.

## How to work
- Ask for the person's checklist from the team plan if she has not pasted it,
  and build in its order. Core screens before stretch.
- Keep changes small; explain what you changed and how to test it on a phone.
- If a rule blocks the task, stop and say which rule, instead of working around it.
