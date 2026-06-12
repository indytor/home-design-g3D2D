// Rate limiter เบา ๆ แบบ in-memory (ต่อ IP, sliding window) — ไม่พึ่ง dependency
// production หลาย instance ควรเปลี่ยนไปใช้ Redis-based limiter
const WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60000);
const MAX = Number(process.env.RATE_MAX || 120);
const hits = new Map();

export function rateLimit(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (arr.length > MAX) {
    return res.status(429).json({ error: "คำขอถี่เกินไป กรุณาลองใหม่ภายหลัง" });
  }
  next();
}

// ล้าง entry เก่าเป็นระยะ กันหน่วยความจำบวม
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of hits) {
    const live = arr.filter(t => now - t < WINDOW_MS);
    if (live.length) hits.set(ip, live); else hits.delete(ip);
  }
}, WINDOW_MS).unref();
