// ค่าตั้งต้นจาก environment (รวมศูนย์ที่เดียว)
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// โหลด .env: ลองที่ repo root ก่อน (รัน `node server/server.js` หรือ `cd server && npm start` ก็เจอ)
// แล้วค่อย fallback เป็น .env ใน cwd — บน Docker ใช้ env จาก compose จึงไม่จำเป็นต้องมีไฟล์
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config();

export const config = {
  port: process.env.PORT || 8080,
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  dataDir: process.env.DATA_DIR || path.join(process.cwd(), "data"),
  dbDriver: process.env.DB_DRIVER || "json", // "json" (default) | future: "postgres"
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  bodyLimit: process.env.BODY_LIMIT || "30mb"
};

export function assertProductionConfig() {
  if (config.jwtSecret === "change-me-in-production") {
    console.warn("⚠️  JWT_SECRET ยังเป็นค่าเริ่มต้น — ตั้งค่าใน .env ก่อนใช้งานจริง");
  }
}
