// API: controller ของรายงาน
import * as reportsService from "../business/reports.service.js";

export async function list(req, res, next) {
  try { res.json(await reportsService.list(req.user.uid)); } catch (e) { next(e); }
}
export async function sync(req, res, next) {
  try { res.json(await reportsService.sync(req.user.uid, req.body?.reports)); } catch (e) { next(e); }
}
export async function create(req, res, next) {
  try { res.json(await reportsService.create(req.user.uid, req.body)); } catch (e) { next(e); }
}
export async function remove(req, res, next) {
  try { res.json(await reportsService.remove(req.user.uid, req.params.id)); } catch (e) { next(e); }
}
