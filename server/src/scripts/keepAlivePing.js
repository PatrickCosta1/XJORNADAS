const targetUrl = String(process.env.KEEPALIVE_URL || "").trim();

if (!targetUrl) {
  // eslint-disable-next-line no-console
  console.error("KEEPALIVE_URL não definido");
  process.exit(1);
}

try {
  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "User-Agent": "jornadas26-keepalive/1.0"
    }
  });

  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.error(`Ping falhou: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(`Ping OK: ${targetUrl}`);
} catch (error) {
  // eslint-disable-next-line no-console
  console.error("Erro no ping keep-alive", error);
  process.exit(1);
}
