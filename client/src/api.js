const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message = data?.message || "Ocorreu um erro";
    throw new Error(message);
  }

  return data;
}

export async function createStudentProfile(formData) {
  const response = await fetch(`${API_URL}/students`, {
    method: "POST",
    body: formData
  });
  return parseResponse(response);
}

export async function getStudentPublic(slug) {
  const response = await fetch(`${API_URL}/students/${slug}`);
  return parseResponse(response);
}

export async function getStudentDashboard(slug, token) {
  const response = await fetch(
    `${API_URL}/students/${slug}/dashboard?token=${encodeURIComponent(token || "")}`
  );
  return parseResponse(response);
}

export async function companyLogin(payload) {
  const response = await fetch(`${API_URL}/company/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function getCompanyDashboard(token) {
  const response = await fetch(`${API_URL}/company/dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseResponse(response);
}

export async function registerScan(slug, token) {
  const response = await fetch(`${API_URL}/students/${slug}/scan`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseResponse(response);
}

export const apiUrl = API_URL;
