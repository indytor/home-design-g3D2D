// JWT ใช้ร่วมทุก service — HS256 + shared secret (อัปเป็น RS256/JWKS ภายหลังได้)
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "change-me-in-production";
const EXPIRES = process.env.JWT_EXPIRES_IN || "30d";

if (SECRET === "change-me-in-production") {
  console.warn("⚠️  JWT_SECRET ยังเป็นค่าเริ่มต้น — ตั้งค่าใน .env ก่อนใช้งานจริง");
}

export function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

export function verify(token) {
  return jwt.verify(token, SECRET);
}

// middleware ตรวจ Bearer token → req.user (ใช้ใน service ที่ต้องล็อกอิน)
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  try {
    req.user = verify(token);
    next();
  } catch (e) {
    res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
  }
}
