// Pollen catch result model (owner: Salma). Fields follow data/reaction-tests.json.
import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
  crewId: String,
  missionDay: Number,
  date: String,
  averageMs: Number,
  catches: Number,
  misses: Number, // data/reaction-tests.json calls this "lapses"
});

export default mongoose.models.ReactionTest || mongoose.model('ReactionTest', reactionSchema);
