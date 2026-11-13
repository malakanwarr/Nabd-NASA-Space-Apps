// AI doctor chat model (owner: Hana Haytham). One saved question and answer from the AI doctor.
// Saved by routes/doctor.js after every answer; read back by GET /api/doctor/history/:crewId
// (and later by the flight surgeon page). May hold private health details: crew member and flight surgeon only.
import mongoose from 'mongoose';

const doctorMessageSchema = new mongoose.Schema(
  {
    crewId: { type: String, index: true },
    question: String,
    reply: String,
    source: String, // 'ai' (live answer) or 'demo' (saved answer, AI offline)
    redFlag: Boolean,
    redFlagReason: String,
    sources: [{ _id: false, n: [Number], title: String, url: String }], // NASA pages the answer cites
    searchMethod: String, // how the NASA passages were found: 'embedding' | 'keyword' | 'none'
  },
  { timestamps: true }, // adds createdAt, so the chat can be shown in order
);

export default mongoose.models.DoctorMessage || mongoose.model('DoctorMessage', doctorMessageSchema);