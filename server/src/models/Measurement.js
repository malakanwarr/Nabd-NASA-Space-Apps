// Measurement model (owner: Layal). Fields follow data/measurements.json readings plus the POST body.
import mongoose from 'mongoose';

const measurementSchema = new mongoose.Schema({
  crewId: String,
  type: String, // 'bloodSugar' for now
  value: Number,
  unit: String,
  fasting: Boolean, // data/measurements.json calls this "beforeMeal"
  takenAt: Date,
  status: String, // 'stable' | 'watch' | 'act'
  advice: String,
});

export default mongoose.models.Measurement || mongoose.model('Measurement', measurementSchema);
