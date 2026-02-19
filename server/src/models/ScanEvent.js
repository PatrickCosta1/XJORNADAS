import mongoose from "mongoose";

const scanEventSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    scannedAt: { type: Date, default: Date.now, index: true },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" }
  },
  { timestamps: true }
);

export const ScanEvent = mongoose.model("ScanEvent", scanEventSchema);
