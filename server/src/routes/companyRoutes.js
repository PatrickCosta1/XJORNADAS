import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Company } from "../models/Company.js";
import { ScanEvent } from "../models/ScanEvent.js";
import { config } from "../config.js";
import { requireCompanyAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/provision", async (req, res) => {
  const setupKey = req.header("x-setup-key");
  if (!setupKey || setupKey !== config.adminSetupKey) {
    return res.status(403).json({ message: "Não autorizado" });
  }

  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({ message: "Dados inválidos" });
  }

  const exists = await Company.findOne({ email: email.toLowerCase().trim() });
  if (exists) {
    return res.status(409).json({ message: "Empresa já existe" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const company = await Company.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash
  });

  return res.status(201).json({
    id: company._id,
    name: company.name,
    email: company.email
  });
});

router.post("/auth/login", async (req, res) => {
  const { name, email, password } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Credenciais inválidas" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  let company = await Company.findOne({ email: normalizedEmail });

  // Fluxo simplificado temporário: cria empresa automaticamente quando não existe.
  if (!company) {
    const fallbackPassword = String(password || "empresa12345");
    const passwordHash = await bcrypt.hash(fallbackPassword, 10);
    company = await Company.create({
      name: String(name || normalizedEmail.split("@")[0] || "Empresa").trim(),
      email: normalizedEmail,
      passwordHash,
      active: true
    });
  }

  if (!company.active) {
    return res.status(401).json({ message: "Empresa inativa" });
  }

  const token = jwt.sign({ sub: company._id.toString() }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });

  return res.json({
    token,
    company: {
      id: company._id,
      name: company.name,
      email: company.email
    }
  });
});

router.get("/me", requireCompanyAuth, async (req, res) => {
  return res.json({
    id: req.company._id,
    name: req.company.name,
    email: req.company.email
  });
});

router.get("/dashboard", requireCompanyAuth, async (req, res) => {
  const scans = await ScanEvent.find({ company: req.company._id })
    .populate("student", "name institutionalEmail slug")
    .sort({ scannedAt: -1 })
    .limit(200);

  return res.json({
    company: {
      id: req.company._id,
      name: req.company.name,
      email: req.company.email
    },
    scans: scans.map((event) => ({
      id: event._id,
      scannedAt: event.scannedAt,
      student: event.student
        ? {
            id: event.student._id,
            name: event.student.name,
            institutionalEmail: event.student.institutionalEmail,
            slug: event.student.slug
          }
        : null
    }))
  });
});

export default router;
