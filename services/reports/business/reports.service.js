// Business: ตรรกะจัดการรายงานต่อผู้ใช้
import * as reports from "../db/reports.repo.js";

const MAX_REPORTS = 500;

export function list(userId) {
  return reports.listByUser(userId);
}

export async function sync(userId, incoming) {
  const records = (Array.isArray(incoming) ? incoming : []).slice(0, MAX_REPORTS).map(r => ({
    ...r,
    id: r.id || reports.newId(),
    userId,
    savedAt: r.savedAt || Date.now()
  }));
  const count = await reports.replaceForUser(userId, records);
  return { ok: true, count };
}

export function create(userId, data) {
  return reports.add({ ...(data || {}), id: reports.newId(), userId, savedAt: Date.now() });
}

export async function remove(userId, id) {
  return { ok: true, removed: await reports.removeForUser(userId, id) };
}
