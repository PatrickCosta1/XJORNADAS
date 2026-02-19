import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config.js";
import { connectDb } from "./db.js";
import companyRoutes from "./routes/companyRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/company", companyRoutes);
app.use("/api/students", studentRoutes);

app.use((err, _req, res, _next) => {
  if (err?.name === "MulterError") {
    return res.status(400).json({ message: "Upload inválido (tamanho máximo: 4MB)" });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ message: "Erro interno" });
});

connectDb()
  .then(() => {
    app.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`API ativa em http://localhost:${config.port}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Falha ao iniciar API", error);
    process.exit(1);
  });
