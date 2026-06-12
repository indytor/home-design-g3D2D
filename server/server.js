// Bootstrap (composition root): ประกอบ 3 เทียร์เข้าด้วยกันแล้วเปิดเซิร์ฟเวอร์
//   Presentation (Tier 1): index.html — เสิร์ฟเป็น static จาก repo root
//   Application (Tier 2):   api/ (controllers/routes) → business/ (services)
//   Data (Tier 3):          db/ (repositories + adapter)
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { config, assertProductionConfig } from "./config.js";
import apiRoutes from "./api/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, ".."); // repo root (index.html อยู่ที่นี่)

assertProductionConfig();

const app = express();
app.use(express.json({ limit: config.bodyLimit })); // รองรับรูปฝังแบบ data URL

// Tier 2: API
app.use("/api", apiRoutes);

// Tier 1: เสิร์ฟ frontend
app.use(express.static(ROOT, { index: "index.html" }));

// Error handler รวมศูนย์ (แปลง AppError.status → HTTP status)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "เซิร์ฟเวอร์ผิดพลาด" });
});

app.listen(config.port, () => console.log(`🚀 Site Report server running on :${config.port}`));
