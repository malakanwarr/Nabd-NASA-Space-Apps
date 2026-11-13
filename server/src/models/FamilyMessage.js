import mongoose from 'mongoose';

const familyMessageSchema = new mongoose.Schema(
  {
    crewId: { type: String, required: true },
    mimeType: { type: String, required: true },
    durationSeconds: { type: Number, required: true, min: 1, max: 60 },
    audio: { type: Buffer, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

familyMessageSchema.index({ crewId: 1, createdAt: -1 });

export default mongoose.models.FamilyMessage
  || mongoose.model('FamilyMessage', familyMessageSchema);
