import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDb } from "../db.js";
import { Company } from "../models/Company.js";

const DEFAULT_COMPANIES = [
  {
    name: "INEGI",
    email: "inegi@inegi.up.pt",
    password: "empresa12345",
    websiteUrl: "https://www.inegi.pt/pt/",
    logoUrl: "https://ani.pt/wp-content/uploads/2024/03/INEGI_00238_15-G02Q49_00-logo-inegi-slogan.png"
  },
  {
    name: "Tlantic",
    email: "info@tlantic.com",
    password: "empresa12345",
    websiteUrl: "https://www.tlantic.com/",
    logoUrl: "https://www.isep.ipp.pt/images/JES_IX/tlantic.png"
  },
  {
    name: "Glintt Global",
    email: "info@glinttglobal.com",
    password: "empresa12345",
    websiteUrl: "https://glinttglobal.com/en/",
    logoUrl: "https://cotecportugal.pt/wp-content/uploads/2020/01/GG_logoV_WM_NAVY_RGB_ASS.png"
  },
  {
    name: "Delloite",
    email: "",
    password: "empresa12345",
    websiteUrl: "https://www.deloitte.com/pt/pt.html",
    logoUrl: "https://cotecportugal.pt/wp-content/uploads/2020/01/DEL_PRI_RGB.png"
  },
  {
    name: "Mecwide SA",
    email: "geral@mecwide.com",
    password: "empresa12345",
    websiteUrl: "https://mecwide.com/en/",
    logoUrl: "https://mecwide.com/wp-content/uploads/2021/03/logo-mecwide-300x79.png"
  },
  {
    name: "Liderteam",
    email: "",
    password: "empresa12345",
    websiteUrl: "https://liderteam.pt/",
    logoUrl: "https://liderteam.pt/cdn/shop/files/Liderteam-_-Consultoria-em-Transformacao-Digital-e-ERP-em-Portugal.png?v=1766063671"
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
