# NABD

NABD is a mobile-first health app for astronauts: one React + Vite web app that installs on phones (a PWA), with a few laptop pages for NASA Mission Control and the flight surgeon. It talks to an Express + MongoDB server.

## How to run

```bash
npm run install:all
cp server/.env.example server/.env   # then fill in the values
npm run dev
```

Open http://localhost:5173. The server runs on port 5050. Without `MONGODB_URI` the server still starts (sample data works, saving does not).

### See your screen before sign-in exists (dev only)

In `npm run dev`, add this to any URL: `?as=sara` signs in as Sara (crew), `?as=admin` signs in as admin, `?as=out` signs out. It never works in the deployed build. Example: http://localhost:5173/body?as=sara

## Testing on an Android phone over USB

1. Turn on USB debugging on the phone and plug it in.
2. On the laptop open `chrome://inspect/#devices`, then **Port forwarding**.
3. Forward `5173` to `localhost:5173` and `5050` to `localhost:5050`.
4. Open `http://localhost:5173` in Chrome on the phone.

Models in `server/src/models/` belong to the owner of the matching route.

## Git rules

- One branch per person: `feature/<folder>` (for example `feature/mood-face`).
- Push every hour.
- After each merge, everyone runs `git pull origin main`.
- Never commit `.env`.
