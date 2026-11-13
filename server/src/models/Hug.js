// Hug model (owner: Hana Sakr). Fields follow data/hugs.json.
import mongoose from 'mongoose';

const hugSchema = new mongoose.Schema({
  from: String, // 'Laila', 'Omar', 'Mona'
  to: { type: String, default: 'sara' },
  missionDay: Number,
  delivered: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Hug || mongoose.model('Hug', hugSchema);
