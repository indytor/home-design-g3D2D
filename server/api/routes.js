// API tier: ผูกเส้นทาง (routes) เข้ากับ controllers — ไม่มีตรรกะธุรกิจที่นี่
import { Router } from "express";
import { requireAuth } from "./middleware/auth.js";
import * as auth from "./auth.controller.js";
import * as reports from "./reports.controller.js";
import * as ai from "./ai.controller.js";

const router = Router();

// Auth
router.post("/auth/register", auth.register);
router.post("/auth/login", auth.login);

// Reports (ต้องเข้าสู่ระบบ)
router.get("/reports", requireAuth, reports.list);
router.put("/reports", requireAuth, reports.sync);
router.post("/reports", requireAuth, reports.create);
router.delete("/reports/:id", requireAuth, reports.remove);

// AI proxy
router.post("/analyze", ai.analyze);
router.post("/generate-image", ai.generateImage);

// Health
router.get("/health", (req, res) => res.json({ ok: true, time: Date.now() }));

export default router;
