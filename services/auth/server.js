// auth-service (:8081) — สมัคร/ล็อกอิน, ออก JWT
import express from "express";
import { errorHandler } from "./shared/AppError.js";
import * as auth from "./api/auth.controller.js";

const PORT = process.env.PORT || 8081;
const app = express();
app.use(express.json({ limit: "1mb" }));

app.post("/auth/register", auth.register);
app.post("/auth/login", auth.login);
app.get("/health", (req, res) => res.json({ ok: true, service: "auth", time: Date.now() }));

app.use(errorHandler);
app.listen(PORT, () => console.log(`🔐 auth-service running on :${PORT}`));
