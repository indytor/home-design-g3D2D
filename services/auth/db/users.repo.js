// Data: repository ผู้ใช้ (auth-service ถือครอง users DB ของตัวเอง)
import * as store from "../shared/jsonAdapter.js";

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
