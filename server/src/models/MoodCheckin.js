// Mood check-in model (owner: Malak). Fields match data/mood-checkins.json.
import mongoose from 'mongoose';

const moodSchema = new mongoose.Schema({
  crewId: String,
  missionDay: Number,
  date: String,
  face: { blinksPerMin: Number, eyeOpenness: Number, smileRate: Number },
  voice: { pitchRangeHz: Number, loudness: Number, pauseRatio: Number, paceSegmentsPerSec: Number },
  context: { sleepHours: Number },
  reactionMs: Number,
  energyScore: Number,
  label: String,
  time: { type: Date, default: Date.now }, // when it was saved; the fatigue experiment sorts by it
});

export default mongoose.models.MoodCheckin || mongoose.model('MoodCheckin', moodSchema);
