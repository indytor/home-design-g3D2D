// API controller: รับ HTTP → เรียก business → ส่ง response (error ส่งต่อ next)
import * as authService from "../business/auth.service.js";

export async function register(req, res, next) {
  try { res.json(await authService.register(req.body?.email, req.body?.password)); }
  catch (e) { next(e); }
}

export async function login(req, res, next) {
  try { res.json(await authService.login(req.body?.email, req.body?.password)); }
  catch (e) { next(e); }
}
