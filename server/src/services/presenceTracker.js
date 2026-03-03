import { Presence } from "../models/Presence.js";

function normalizeMecanographic(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function extractMecanographicFromEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  const atIndex = value.lastIndexOf("@");
  if (atIndex <= 0) return "";
  const localPart = value.slice(0, atIndex);
  return normalizeMecanographic(localPart);
}

export async function trackPresence({
  name,
  institutionalEmail,
  mecanographicNumber,
  inEnrollmentCsv,
  entryType,
  studentId
}) {
  const normalizedEmail = String(institutionalEmail || "").trim().toLowerCase();
  if (!name || !normalizedEmail) {
    return null;
  }

  const now = new Date();
  const normalizedMecanographic = normalizeMecanographic(mecanographicNumber);

  return Presence.findOneAndUpdate(
    { institutionalEmail: normalizedEmail },
    {
      $set: {
        name: String(name).trim(),
        institutionalEmail: normalizedEmail,
        mecanographicNumber: normalizedMecanographic,
        lastSeenAt: now,
        lastEntryType: entryType,
        student: studentId || null
      },
      $inc: { totalEntries: 1 },
      $setOnInsert: {
        firstSeenAt: now,
        inEnrollmentCsv: Boolean(inEnrollmentCsv)
      },
      $max: {
        inEnrollmentCsv: Boolean(inEnrollmentCsv)
      }
    },
    {
      new: true,
      upsert: true
    }
  );
}
