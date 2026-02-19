import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jornadas26",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  adminSetupKey: process.env.ADMIN_SETUP_KEY || "setup-dev-key",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:5173",
  allowedStudentEmailDomains: (process.env.ALLOWED_STUDENT_EMAIL_DOMAINS || "isep.ipp.pt")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
};
