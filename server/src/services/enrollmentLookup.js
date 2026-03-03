import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeMecanographic(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function findColumnIndex(headers, preferredName, patterns) {
  if (!Array.isArray(headers) || headers.length === 0) return -1;

  const normalizedHeaders = headers.map((header) => normalizeText(header));
  const preferred = normalizeText(preferredName);

  if (preferred) {
    const exactPreferred = normalizedHeaders.findIndex((header) => header === preferred);
    if (exactPreferred >= 0) return exactPreferred;

    const containsPreferred = normalizedHeaders.findIndex((header) => header.includes(preferred));
    if (containsPreferred >= 0) return containsPreferred;
  }

  for (const pattern of patterns) {
    const normalizedPattern = normalizeText(pattern);
    const index = normalizedHeaders.findIndex((header) => header.includes(normalizedPattern));
    if (index >= 0) return index;
  }

  return -1;
}

async function loadCsvRows() {
  const csvRelativePath = config.enrollmentLookup.csvPath;
  const csvAbsolutePath = path.resolve(process.cwd(), csvRelativePath);
  const rawContent = await readFile(csvAbsolutePath, "utf8");
  const lines = rawContent
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const [headerLine, ...dataLines] = lines;
  const headers = parseCsvLine(headerLine);
  const rows = dataLines.map(parseCsvLine).filter((row) => row.some((value) => String(value || "").trim()));

  return { headers, rows };
}

export function isEnrollmentLookupConfigured() {
  return Boolean(config.enrollmentLookup.csvPath);
}

export async function findEnrollmentByMecanographicNumber(mecanographicNumber) {
  if (!isEnrollmentLookupConfigured()) {
    throw new Error("Validação por CSV não configurada");
  }

  const normalizedInput = normalizeMecanographic(mecanographicNumber);
  if (!normalizedInput) return null;

  const { headers, rows } = await loadCsvRows();
  if (!headers.length || !rows.length) {
    return null;
  }

  const mecanographicIndex = findColumnIndex(
    headers,
    config.enrollmentLookup.mecanographicColumn,
    ["mecanografico", "numero mecanografico", "n mecanografico", "num mecanografico"]
  );

  const nameIndex = findColumnIndex(
    headers,
    config.enrollmentLookup.nameColumn,
    ["nome completo", "nome", "aluno"]
  );

  if (mecanographicIndex < 0 || nameIndex < 0) {
    throw new Error("Não foi possível identificar as colunas no CSV de inscrições");
  }

  const match = rows.find((row) => normalizeMecanographic(row?.[mecanographicIndex]) === normalizedInput);
  if (!match) {
    return null;
  }

  const name = String(match[nameIndex] || "").trim();
  if (!name) {
    throw new Error("Inscrição encontrada sem nome completo");
  }

  const emailDomain = String(config.enrollmentLookup.institutionalEmailDomain || "isep.ipp.pt")
    .trim()
    .toLowerCase();

  return {
    mecanographicNumber: String(match[mecanographicIndex] || "").trim(),
    name,
    institutionalEmail: `${normalizedInput}@${emailDomain}`
  };
}

export async function isMecanographicInEnrollmentCsv(mecanographicNumber) {
  const enrollment = await findEnrollmentByMecanographicNumber(mecanographicNumber);
  return Boolean(enrollment);
}
