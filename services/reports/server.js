// reports-service (:8082) — CRUD/sync รายงานต่อผู้ใช้ (ตรวจ JWT เอง)
import express from "express";
import { errorHandler } from "./shared/AppError.js";
import { requireAuth } from "./shared/jwt.js";
import * as reports from "./api/reports.controller.js";

const PORT = process.env.PORT || 8082;
const app = express();
app.use(express.json({ limit: process.env.BODY_LIMIT || "30mb" }));

app.get("/reports", requireAuth, reports.list);
app.put("/reports", requireAuth, reports.sync);
app.post("/reports", requireAuth, reports.create);
app.delete("/reports/:id", requireAuth, reports.remove);
app.get("/health", (req, res) => res.json({ ok: true, service: "reports", time: Date.now() }));

app.use(errorHandler);
app.listen(PORT, () => console.log(`📋 reports-service running on :${PORT}`));
