// Cycle symptom log model (owner: Layal). PRIVATE data. Fields follow the POST /log body.
import mongoose from 'mongoose';

const cycleLogSchema = new mongoose.Schema({
  crewId: String,
  date: String,
  area: String,
  symptoms: [String],
  strength: Number,
  notes: String,
});

export default mongoose.models.CycleLog || mongoose.model('CycleLog', cycleLogSchema);
