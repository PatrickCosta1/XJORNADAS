import express from "express";
import multer from "multer";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { Student } from "../models/Student.js";
import { ScanEvent } from "../models/ScanEvent.js";
import { config } from "../config.js";
import { requireCompanyAuth } from "../middleware/auth.js";
import {
  findEnrollmentByMecanographicNumber,
  isEnrollmentLookupConfigured,
  isMecanographicInEnrollmentCsv
} from "../services/enrollmentLookup.js";
import { extractMecanographicFromEmail, trackPresence } from "../services/presenceTracker.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});

function isAllowedInstitutionalEmail(email) {
  const normalized = String(email || "").toLowerCase().trim();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0) return false;
  const domain = normalized.slice(atIndex + 1);
  return config.allowedStudentEmailDomains.includes(domain);
}

function normalizeLinkedin(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function getPublicProfileUrl(slug) {
  const base = String(config.appBaseUrl || "").replace(/\/+$/, "");
  return `${base}/p/${slug}`;
}

function getDashboardUrl(slug, token) {
  const base = String(config.appBaseUrl || "").replace(/\/+$/, "");
  return `${base}/student/${slug}/dashboard?token=${token}`;
}

router.post("/enrollment-lookup", async (req, res) => {
  const mecanographicNumber = String(req.body?.mecanographicNumber || "").trim();

  if (!mecanographicNumber) {
    return res.status(400).json({ message: "Indica o número mecanográfico" });
  }

  if (!isEnrollmentLookupConfigured()) {
    return res.status(503).json({ message: "Validação de inscrições indisponível" });
  }

  const enrollment = await findEnrollmentByMecanographicNumber(mecanographicNumber);
  if (!enrollment) {
    return res.status(404).json({ message: "Número mecanográfico não encontrado nas inscrições" });
  }

  try {
    await trackPresence({
      name: enrollment.name,
      institutionalEmail: enrollment.institutionalEmail,
      mecanographicNumber: enrollment.mecanographicNumber,
      inEnrollmentCsv: true,
      entryType: "csv_lookup"
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Falha ao registar presença por CSV", error);
  }

  return res.json({
    found: true,
    student: {
      mecanographicNumber: enrollment.mecanographicNumber,
      name: enrollment.name,
      institutionalEmail: enrollment.institutionalEmail
    }
  });
});

router.post("/", upload.single("cv"), async (req, res) => {
  const { name, institutionalEmail, linkedinUrl } = req.body;

  if (!name || !institutionalEmail) {
    return res.status(400).json({ message: "Nome e email institucional são obrigatórios" });
  }

  if (!isAllowedInstitutionalEmail(institutionalEmail)) {
    return res.status(400).json({
      message: `O email deve pertencer a: ${config.allowedStudentEmailDomains.join(", ")}`
    });
  }

  const linkedin = normalizeLinkedin(linkedinUrl);
  if (linkedin && !/^https?:\/\//i.test(linkedin)) {
    return res.status(400).json({ message: "LinkedIn inválido" });
  }

  if (req.file && req.file.mimetype !== "application/pdf") {
    return res.status(400).json({ message: "O CV deve estar em PDF" });
  }

  const slug = nanoid(10);
  const accessToken = nanoid(30);

  const student = await Student.create({
    slug,
    accessToken,
    name: name.trim(),
    institutionalEmail: institutionalEmail.toLowerCase().trim(),
    linkedinUrl: linkedin,
    cv: req.file
      ? {
          data: req.file.buffer,
          contentType: req.file.mimetype,
          fileName: req.file.originalname,
          size: req.file.size
        }
      : undefined
  });

  const mecanographicFromEmail = extractMecanographicFromEmail(student.institutionalEmail);
  let existsInCsv = false;

  if (mecanographicFromEmail && isEnrollmentLookupConfigured()) {
    try {
      existsInCsv = await isMecanographicInEnrollmentCsv(mecanographicFromEmail);
    } catch {
      existsInCsv = false;
    }
  }

  if (!existsInCsv) {
    try {
      await trackPresence({
        name: student.name,
        institutionalEmail: student.institutionalEmail,
        mecanographicNumber: mecanographicFromEmail,
        inEnrollmentCsv: false,
        entryType: "manual_registration",
        studentId: student._id
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Falha ao registar presença por inscrição manual", error);
    }
  }

  const publicProfileUrl = getPublicProfileUrl(student.slug);
  const dashboardUrl = getDashboardUrl(student.slug, student.accessToken);
  const qrCodeDataUrl = await QRCode.toDataURL(publicProfileUrl, { width: 380, margin: 1 });

  return res.status(201).json({
    slug: student.slug,
    accessToken: student.accessToken,
    publicProfileUrl,
    dashboardUrl,
    qrCodeDataUrl
  });
});

router.get("/:slug", async (req, res) => {
  const student = await Student.findOne({ slug: req.params.slug }).select(
    "name institutionalEmail linkedinUrl slug cv"
  );
  if (!student) {
    return res.status(404).json({ message: "Perfil não encontrado" });
  }

  return res.json({
    slug: student.slug,
    name: student.name,
    institutionalEmail: student.institutionalEmail,
    linkedinUrl: student.linkedinUrl || "",
    hasCv: Boolean(student.cv?.data)
  });
});

router.get("/:slug/cv", async (req, res) => {
  const student = await Student.findOne({ slug: req.params.slug }).select("name cv");
  if (!student || !student.cv?.data) {
    return res.status(404).json({ message: "CV não encontrado" });
  }

  res.setHeader("Content-Type", student.cv.contentType || "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${student.cv.fileName || `${student.name}_CV.pdf`}"`
  );
  return res.send(student.cv.data);
});

router.get("/:slug/dashboard", async (req, res) => {
  const { token } = req.query;
  const student = await Student.findOne({ slug: req.params.slug });

  if (!student) {
    return res.status(404).json({ message: "Perfil não encontrado" });
  }

  if (!token || token !== student.accessToken) {
    return res.status(403).json({ message: "Acesso inválido" });
  }

  const scans = await ScanEvent.find({ student: student._id })
    .populate("company", "name email logoUrl websiteUrl")
    .sort({ scannedAt: -1 })
    .limit(500);

  const publicProfileUrl = getPublicProfileUrl(student.slug);
  const qrCodeDataUrl = await QRCode.toDataURL(publicProfileUrl, { width: 380, margin: 1 });

  return res.json({
    student: {
      slug: student.slug,
      name: student.name,
      institutionalEmail: student.institutionalEmail,
      linkedinUrl: student.linkedinUrl || "",
      hasCv: Boolean(student.cv?.data)
    },
    links: {
      publicProfileUrl,
      dashboardUrl: getDashboardUrl(student.slug, student.accessToken)
    },
    qrCodeDataUrl,
    scans: scans.map((event) => ({
      id: event._id,
      scannedAt: event.scannedAt,
      company: event.company
        ? {
            id: event.company._id,
            name: event.company.name,
            email: event.company.email,
            logoUrl: event.company.logoUrl || "",
            websiteUrl: event.company.websiteUrl || ""
          }
        : { id: null, name: "Empresa removida", email: "" }
    }))
  });
});

router.patch("/:slug/profile", upload.single("cv"), async (req, res) => {
  const { token } = req.query;
  const student = await Student.findOne({ slug: req.params.slug });

  if (!student) {
    return res.status(404).json({ message: "Perfil não encontrado" });
  }

  if (!token || token !== student.accessToken) {
    return res.status(403).json({ message: "Acesso inválido" });
  }

  const linkedin = normalizeLinkedin(req.body?.linkedinUrl || "");
  if (linkedin && !/^https?:\/\//i.test(linkedin)) {
    return res.status(400).json({ message: "LinkedIn inválido" });
  }

  if (req.file && req.file.mimetype !== "application/pdf") {
    return res.status(400).json({ message: "O CV deve estar em PDF" });
  }

  student.linkedinUrl = linkedin;

  if (req.file) {
    student.cv = {
      data: req.file.buffer,
      contentType: req.file.mimetype,
      fileName: req.file.originalname,
      size: req.file.size
    };
  }

  await student.save();

  return res.json({
    student: {
      slug: student.slug,
      name: student.name,
      institutionalEmail: student.institutionalEmail,
      linkedinUrl: student.linkedinUrl || "",
      hasCv: Boolean(student.cv?.data)
    }
  });
});

router.post("/:slug/scan", requireCompanyAuth, async (req, res) => {
  const student = await Student.findOne({ slug: req.params.slug }).select("_id");
  if (!student) {
    return res.status(404).json({ message: "Perfil não encontrado" });
  }

  await ScanEvent.create({
    student: student._id,
    company: req.company._id,
    ipAddress: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString(),
    userAgent: req.headers["user-agent"] || ""
  });

  return res.status(201).json({ message: "Leitura registada" });
});

export default router;