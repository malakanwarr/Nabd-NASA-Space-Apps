// Server entry point for local development (Malak only): npm run dev. All routes live in app.js.
import 'dotenv/config';
import app from './app.js';
import { connectDb } from './db.js';

await connectDb();

const port = process.env.PORT || 5050;
app.listen(port, () => console.log(`NABD server listening on http://localhost:${port}`));
