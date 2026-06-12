// Self-hosted backend สำหรับระบบรายงานหน้างาน
// - เสิร์ฟ frontend (index.html ที่ repo root)
// - REST API: สมัคร/ล็อกอิน (JWT), จัดการรายงานต่อผู้ใช้ (ซิงค์คลาวด์)
// - พร็อกซี OpenAI: /api/analyze, /api/generate-image (key อยู่ฝั่งเซิร์ฟเวอร์)
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readAll, writeAll, genId } from "./store.js";
import { analyze, generateImage } from "./ai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
if (JWT_SECRET === "change-me-in-production") {
  console.warn("⚠️  JWT_SECRET ยังเป็นค่าเริ่มต้น — ตั้งค่าใน .env ก่อนใช้งานจริง");
}

const app = express();
app.use(express.json({ limit: "30mb" })); // รองรับรูปฝังแบบ data URL

// ---------- Auth helpers ----------
function sign(user) {
  return jwt.sign({ uid: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
}
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
  }
}

// ---------- Auth routes ----------
app.post("/api/auth/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !email.includes("@")) return res.status(400).json({ error: "อีเมลไม่ถูกต้อง" });
    if (password.length < 6) return res.status(400).json({ error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" });
    const users = await readAll("users");
    if (users.find(u => u.email === email)) return res.status(409).json({ error: "อีเมลนี้มีผู้ใช้แล้ว" });
    const user = { id: genId(), email, hash: bcrypt.hashSync(password, 10), createdAt: Date.now() };
    users.push(user);
    await writeAll("users", users);
    res.json({ token: sign(user), email });
  } catch (e) {
    res.status(500).json({ error: "สมัครไม่สำเร็จ: " + e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const users = await readAll("users");
    const user = users.find(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.hash)) {
      return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }
    res.json({ token: sign(user), email });
  } catch (e) {
    res.status(500).json({ error: "เข้าสู่ระบบไม่สำเร็จ: " + e.message });
  }
});

// ---------- Reports (ต่อผู้ใช้) ----------
app.get("/api/reports", auth, async (req, res) => {
  const all = await readAll("reports");
  res.json(all.filter(r => r.userId === req.user.uid).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)));
});

// แทนที่ชุดรายงานทั้งหมดของผู้ใช้ (ซิงค์จาก client) — ง่ายและพอสำหรับ MVP
app.put("/api/reports", auth, async (req, res) => {
  const incoming = Array.isArray(req.body?.reports) ? req.body.reports : [];
  const all = await readAll("reports");
  const others = all.filter(r => r.userId !== req.user.uid);
  const mine = incoming.slice(0, 500).map(r => ({
    ...r,
    id: r.id || genId(),
    userId: req.user.uid,
    savedAt: r.savedAt || Date.now()
  }));
  await writeAll("reports", others.concat(mine));
  res.json({ ok: true, count: mine.length });
});

app.post("/api/reports", auth, async (req, res) => {
  const all = await readAll("reports");
  const rec = { ...(req.body || {}), id: genId(), userId: req.user.uid, savedAt: Date.now() };
  all.push(rec);
  await writeAll("reports", all);
  res.json(rec);
});

app.delete("/api/reports/:id", auth, async (req, res) => {
  const all = await readAll("reports");
  const next = all.filter(r => !(r.userId === req.user.uid && r.id === req.params.id));
  await writeAll("reports", next);
  res.json({ ok: true, removed: all.length - next.length });
});

// ---------- AI proxy ----------
app.post("/api/analyze", async (req, res) => {
  try { const r = await analyze(req.body || {}); res.status(r.status).json(r.body); }
  catch (e) { res.status(500).json({ error: "เซิร์ฟเวอร์ผิดพลาด: " + e.message }); }
});
app.post("/api/generate-image", async (req, res) => {
  try { const r = await generateImage(req.body || {}); res.status(r.status).json(r.body); }
  catch (e) { res.status(500).json({ error: "เซิร์ฟเวอร์ผิดพลาด: " + e.message }); }
});

// ---------- Health + static frontend ----------
app.get("/api/health", (req, res) => res.json({ ok: true, time: Date.now() }));
app.use(express.static(ROOT, { index: "index.html" }));

app.listen(PORT, () => console.log(`🚀 Site Report server running on :${PORT}`));
