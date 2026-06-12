// API middleware: ตรวจ JWT แล้วแนบ req.user
import * as authService from "../../business/auth.service.js";

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  try {
    req.user = authService.verifyToken(token);
    next();
  } catch (e) {
    res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
  }
}
