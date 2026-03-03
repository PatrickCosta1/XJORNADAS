import mongoose from "mongoose";

const presenceSchema = new mongoose.Schema(
  {
    institutionalEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    mecanographicNumber: { type: String, default: "", trim: true, index: true },
    inEnrollmentCsv: { type: Boolean, default: false },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    totalEntries: { type: Number, default: 1 },
    lastEntryType: {
      type: String,
      enum: ["csv_lookup", "manual_registration"],
      required: true
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null }
  },
  { timestamps: true }
);

export const Presence = mongoose.model("Presence", presenceSchema);
