import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDb } from "../db.js";
import { Company } from "../models/Company.js";

const DEFAULT_COMPANIES = [
  {
    name: "Critical Manufacturing",
    email: "rh@criticalmanufacturing.com",
    password: "empresa12345",
    websiteUrl: "https://share.google/NYqzLvmMglI0LOrPJ",
    logoUrl: "https://www.ats-global.com/wp-content/uploads/2021/07/ATS_Partner_Critical_Manufacturing_logo.png"
  },
  {
    name: "Bosch",
    email: "talent@bosch.com",
    password: "empresa12345",
    websiteUrl: "https://share.google/ns99mSWHIyxiCS9WO",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bosch-logo.svg/1280px-Bosch-logo.svg.png"
  },
  {
    name: "Blip",
    email: "careers@blip.pt",
    password: "empresa12345",
    websiteUrl: "https://share.google/o0vQrttlscsarizj3",
    logoUrl: "https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/c_limit,fl_lossy,h_1440,w_720,f_auto,q_auto/9310/20907_615624.png"
  }
];

async function upsertCompany(companyInput) {
  const email = String(companyInput.email || "").toLowerCase().trim();
  const name = String(companyInput.name || "").trim();
  const password = String(companyInput.password || "").trim();
  const websiteUrl = String(companyInput.websiteUrl || "").trim();
  const logoUrl = String(companyInput.logoUrl || "").trim();

  if (!email || !name || password.length < 8) {
    throw new Error(`Dados inválidos para empresa: ${JSON.stringify(companyInput)}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const company = await Company.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        email,
        websiteUrl,
        logoUrl,
        isDefaultLogin: true,
        passwordHash,
        active: true
      }
    },
    { new: true, upsert: true }
  );

  return company;
}

async function run() {
  await connectDb();

  for (const companyInput of DEFAULT_COMPANIES) {
    const company = await upsertCompany(companyInput);
    // eslint-disable-next-line no-console
    console.log(`Empresa pronta: ${company.name} <${company.email}>`);
  }

  // eslint-disable-next-line no-console
  console.log("Seed de empresas concluído.");
  await mongoose.connection.close();
}

run().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error("Falha no seed de empresas", error);
  await mongoose.connection.close();
  process.exit(1);
});
