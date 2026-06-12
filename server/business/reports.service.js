// Business: ตรรกะจัดการรายงานต่อผู้ใช้
import * as reports from "../db/reports.repo.js";

const MAX_REPORTS = 500;

export function list(userId) {
  return reports.listByUser(userId);
}

// ซิงค์: แทนที่ชุดรายงานทั้งหมดของผู้ใช้ (ผูก userId/savedAt/id ให้เรียบร้อย)
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
  const record = { ...(data || {}), id: reports.newId(), userId, savedAt: Date.now() };
  return reports.add(record);
}

export async function remove(userId, id) {
  const removed = await reports.removeForUser(userId, id);
  return { ok: true, removed };
}
