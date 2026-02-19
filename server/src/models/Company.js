import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoUrl: { type: String, default: "", trim: true },
    websiteUrl: { type: String, default: "", trim: true },
    isDefaultLogin: { type: Boolean, default: false, index: true },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Company = mongoose.model("Company", companySchema);
