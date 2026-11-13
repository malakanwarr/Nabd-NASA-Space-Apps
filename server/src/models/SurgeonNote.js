// Flight surgeon note model (owner: Hana Haytham). One AI doctor answer that the astronaut chose to send to Earth.
// Created by POST /api/surgeon/:crewId/notes, read by GET /api/surgeon/:crewId (the flight surgeon page).
// Fields follow data/surgeon-notes.json. Private health details: crew member and flight surgeon only.
import mongoose from 'mongoose';

const surgeonNoteSchema = new mongoose.Schema(
  {
    crewId: { type: String, index: true },
    messageId: { type: String, index: true }, // the saved AI doctor answer (DoctorMessage) this note came from
    summary: String, // short note for the flight surgeon, written by the AI (or a plain version if the AI is down)
    summaryBy: String, // 'ai' | 'plain'
    question: String, // what she asked the AI doctor
    reply: String, // what the AI doctor answered
    redFlag: Boolean,
    redFlagReason: String,
    sources: [{ _id: false, n: [Number], title: String, url: String }], // NASA pages the answer cited
    sentAt: Date, // left the ship
    arrivesAt: Date, // reaches Earth: sentAt + the one-way delay from data/mission.json
    surgeonReply: { text: String, repliedAt: Date }, // filled in later from the flight surgeon page
  },
  { timestamps: true },
);

export default mongoose.models.SurgeonNote || mongoose.model('SurgeonNote', surgeonNoteSchema);
