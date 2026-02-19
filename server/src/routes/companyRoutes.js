import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Company } from "../models/Company.js";
import { ScanEvent } from "../models/ScanEvent.js";
import { config } from "../config.js";
import { requireCompanyAuth } from "../middleware/auth.js";

const router = express.Router();

function normalizeWebsiteUrl(websiteUrl, email) {
  const trimmed = String(websiteUrl || "").trim();
  if (trimmed) {
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const atIndex = normalizedEmail.lastIndexOf("@");
  if (atIndex <= 0) return "";
  return `https://${normalizedEmail.slice(atIndex + 1)}`;
}

function normalizeLogoUrl(logoUrl, websiteUrl, email, name) {
  const trimmed = String(logoUrl || "").trim();
  if (trimmed) return trimmed;

  const website = normalizeWebsiteUrl(websiteUrl, email);
  try {
    const domain = new URL(website).hostname;
    if (domain) {
      return `https://logo.clearbit.com/${domain}`;
    }
  } catch {
    // segue fallback
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Empresa")}&background=d34600&color=fff`;
}

router.post("/provision", async (req, res) => {
  const setupKey = req.header("x-setup-key");
  if (!setupKey || setupKey !== config.adminSetupKey) {
    return res.status(403).json({ message: "Não autorizado" });
  }

  const { name, email, password, logoUrl, websiteUrl } = req.body;
  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({ message: "Dados inválidos" });
  }

  const exists = await Company.findOne({ email: email.toLowerCase().trim() });
  if (exists) {
    return res.status(409).json({ message: "Empresa já existe" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedWebsiteUrl = normalizeWebsiteUrl(websiteUrl, email);
  const company = await Company.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    websiteUrl: normalizedWebsiteUrl,
    logoUrl: normalizeLogoUrl(logoUrl, normalizedWebsiteUrl, email, name),
    passwordHash
  });

  return res.status(201).json({
    id: company._id,
    name: company.name,
    email: company.email,
    logoUrl: company.logoUrl || "",
    websiteUrl: company.websiteUrl || ""
  });
});

router.post("/auth/login", async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.status(400).json({ message: "Credenciais inválidas" });
  }

  const normalizedName = String(name).trim();
  const company = await Company.findOne({
    name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    isDefaultLogin: true
  });

  if (!company) {
    return res.status(401).json({ message: "Login de empresa inválido" });
  }

  if (!company.active) {
    return res.status(401).json({ message: "Empresa inativa" });
  }

  const matches = await bcrypt.compare(String(password), company.passwordHash);
  if (!matches) {
    return res.status(401).json({ message: "Login de empresa inválido" });
  }

  const token = jwt.sign({ sub: company._id.toString() }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });

  return res.json({
    token,
    company: {
      id: company._id,
      name: company.name,
      email: company.email,
      logoUrl: company.logoUrl || "",
      websiteUrl: company.websiteUrl || ""
    }
  });
});

router.get("/me", requireCompanyAuth, async (req, res) => {
  return res.json({
    id: req.company._id,
    name: req.company.name,
    email: req.company.email,
    logoUrl: req.company.logoUrl || "",
    websiteUrl: req.company.websiteUrl || ""
  });
});

router.get("/dashboard", requireCompanyAuth, async (req, res) => {
  const scans = await ScanEvent.find({ company: req.company._id })
    .populate("student", "name institutionalEmail slug linkedinUrl cv.size")
    .sort({ scannedAt: -1 })
    .limit(200);

  return res.json({
    company: {
      id: req.company._id,
      name: req.company.name,
      email: req.company.email,
      logoUrl: req.company.logoUrl || "",
      websiteUrl: req.company.websiteUrl || ""
    },
    scans: scans.map((event) => ({
      id: event._id,
      scannedAt: event.scannedAt,
      student: event.student
        ? {
            id: event.student._id,
            name: event.student.name,
            institutionalEmail: event.student.institutionalEmail,
            slug: event.student.slug,
            linkedinUrl: event.student.linkedinUrl || "",
            hasCv: Boolean(event.student.cv?.size)
          }
        : null
    }))
  });
});

export default router;
