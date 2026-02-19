import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { Company } from "../models/Company.js";

export async function requireCompanyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const payload = jwt.verify(token, config.jwtSecret);
    const company = await Company.findById(payload.sub);

    if (!company || !company.active) {
      return res.status(401).json({ message: "Sessão inválida" });
    }

    req.company = company;
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}
