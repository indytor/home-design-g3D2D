// Repository: ผู้ใช้ (ชั้น Data) — business layer เรียกผ่านที่นี่ ไม่แตะ adapter ตรง ๆ
import { store } from "./index.js";

const COL = "users";

export async function findByEmail(email) {
  const users = await store.readAll(COL);
  return users.find(u => u.email === email) || null;
}

export async function create(user) {
  const users = await store.readAll(COL);
  users.push(user);
  await store.writeAll(COL, users);
  return user;
}

export const newId = () => store.genId();
