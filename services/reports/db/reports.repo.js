// Data: repository รายงาน (reports-service ถือครอง reports DB ของตัวเอง)
import * as store from "../shared/jsonAdapter.js";

const COL = "reports";

export async function listByUser(userId) {
  const all = await store.readAll(COL);
  return all.filter(r => r.userId === userId).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

export async function replaceForUser(userId, records) {
  const all = await store.readAll(COL);
  const others = all.filter(r => r.userId !== userId);
  await store.writeAll(COL, others.concat(records));
  return records.length;
}

export async function add(record) {
  const all = await store.readAll(COL);
  all.push(record);
  await store.writeAll(COL, all);
  return record;
}

export async function removeForUser(userId, id) {
  const all = await store.readAll(COL);
  const next = all.filter(r => !(r.userId === userId && r.id === id));
  await store.writeAll(COL, next);
  return all.length - next.length;
}

export const newId = () => store.genId();
