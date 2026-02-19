import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    institutionalEmail: { type: String, required: true, lowercase: true, trim: true },
    linkedinUrl: { type: String, default: "", trim: true },
    cv: {
      data: Buffer,
      contentType: String,
      fileName: String,
      size: Number
    }
  },
  { timestamps: true }
);

export const Student = mongoose.model("Student", studentSchema);
