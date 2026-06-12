// api-gateway (:8080) — จุดเข้าเดียว: เสิร์ฟ frontend + routing ไป microservices
//   /api/auth/*                     → auth-service
//   /api/reports*                   → reports-service
//   /api/analyze, /api/generate-image → ai-service
// (ตัด prefix /api ออกก่อนส่งต่อ เพราะ service ภายในใช้ /auth, /reports, /analyze)
import express from "express";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";
import { rateLimit } from "./rateLimit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", ".."); // repo root (index.html)

const PORT = process.env.PORT || 8080;
const AUTH_URL = process.env.AUTH_URL || "http://auth:8081";
const REPORTS_URL = process.env.REPORTS_URL || "http://reports:8082";
const AI_URL = process.env.AI_URL || "http://ai:8083";

const app = express();

// แนบ X-Request-Id เพื่อ trace ข้ามบริการ
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
});

app.get("/api/health", (req, res) => res.json({ ok: true, service: "gateway", time: Date.now() }));

// rate limit เฉพาะ /api/*
app.use("/api", rateLimit);

const proxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite: { "^/api": "" },
  proxyTimeout: 120000,
  timeout: 120000,
  onProxyReq: (proxyReq, req) => proxyReq.setHeader("x-request-id", req.id),
  onError: (err, req, res) => {
    if (!res.headersSent) res.status(502).json({ error: "บริการปลายทางไม่ตอบสนอง: " + err.code });
  }
});

app.use("/api/auth", proxy(AUTH_URL));
app.use(["/api/analyze", "/api/generate-image"], proxy(AI_URL));
app.use("/api/reports", proxy(REPORTS_URL));

// เสิร์ฟ frontend
app.use(express.static(ROOT, { index: "index.html" }));

app.listen(PORT, () => console.log(`🚪 api-gateway running on :${PORT} → auth=${AUTH_URL} reports=${REPORTS_URL} ai=${AI_URL}`));
