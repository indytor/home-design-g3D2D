// Business: ตรรกะสมัคร/ล็อกอิน + ออก JWT
import bcrypt from "bcryptjs";
import { AppError } from "../shared/AppError.js";
import { sign } from "../shared/jwt.js";
import * as users from "../db/users.repo.js";

const normalize = e => String(e || "").trim().toLowerCase();

export async function register(emailRaw, password) {
  const email = normalize(emailRaw);
  if (!email || !email.includes("@")) throw new AppError(400, "อีเมลไม่ถูกต้อง");
  if (!password || String(password).length < 6) throw new AppError(400, "รหัสผ่านอย่างน้อย 6 ตัวอักษร");
  if (await users.findByEmail(email)) throw new AppError(409, "อีเมลนี้มีผู้ใช้แล้ว");

  const user = { id: users.newId(), email, hash: bcrypt.hashSync(String(password), 10), role: "owner", createdAt: Date.now() };
  await users.create(user);
  return { token: sign({ uid: user.id, email: user.email, role: user.role }), email };
}

export async function login(emailRaw, password) {
  const email = normalize(emailRaw);
  const user = await users.findByEmail(email);
  if (!user || !bcrypt.compareSync(String(password || ""), user.hash)) {
    throw new AppError(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }
  return { token: sign({ uid: user.id, email: user.email, role: user.role || "owner" }), email };
}
