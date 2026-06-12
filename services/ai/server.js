// ai-service (:8083) — พร็อกซี OpenAI (วิเคราะห์ภาพ + สร้างภาพ) stateless
import express from "express";
import { errorHandler } from "./shared/AppError.js";
import * as ai from "./business/ai.service.js";

const PORT = process.env.PORT || 8083;
const app = express();
app.use(express.json({ limit: process.env.BODY_LIMIT || "30mb" }));

app.post("/analyze", async (req, res, next) => {
  try { res.json(await ai.analyze(req.body || {})); } catch (e) { next(e); }
});
app.post("/generate-image", async (req, res, next) => {
  try { res.json(await ai.generateImage(req.body || {})); } catch (e) { next(e); }
});
app.get("/health", (req, res) => res.json({ ok: true, service: "ai", time: Date.now() }));

app.use(errorHandler);
app.listen(PORT, () => console.log(`🤖 ai-service running on :${PORT}`));
