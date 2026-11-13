// Crew member model (owner: Salma). Fields follow data/crew.json where they exist.
import mongoose from 'mongoose';

const crewSchema = new mongoose.Schema({
  id: { type: String, unique: true }, // short id like 'sara' (data/crew.json "id")
  name: String,
  role: String,
  mission: String,
  birthDate: String,
  allergies: [String],
  surgeon: String,
  pin: String, // demo PIN only (prototype); data/crew.json calls it "demoPin"
});

export default mongoose.models.Crew || mongoose.model('Crew', crewSchema);
