// API: controller ของ auth
import * as authService from "../business/auth.service.js";

export async function register(req, res, next) {
  try { res.json(await authService.register(req.body?.email, req.body?.password)); }
  catch (e) { next(e); }
}

export async function login(req, res, next) {
  try { res.json(await authService.login(req.body?.email, req.body?.password)); }
  catch (e) { next(e); }
}
