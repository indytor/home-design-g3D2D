// Business: ตรรกะการสมัคร/เข้าสู่ระบบ + JWT (ไม่ยุ่งกับ HTTP, ไม่ยุ่งกับไฟล์ตรง ๆ)
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { AppError } from "../util/AppError.js";
import * as users from "../db/users.repo.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function signToken(user) {
  return jwt.sign({ uid: user.id, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret); // โยน error ถ้าไม่ถูกต้อง
}

export async function register(emailRaw, password) {
  const email = normalizeEmail(emailRaw);
  if (!email || !email.includes("@")) throw new AppError(400, "อีเมลไม่ถูกต้อง");
  if (!password || String(password).length < 6) throw new AppError(400, "รหัสผ่านอย่างน้อย 6 ตัวอักษร");
  if (await users.findByEmail(email)) throw new AppError(409, "อีเมลนี้มีผู้ใช้แล้ว");

  const user = { id: users.newId(), email, hash: bcrypt.hashSync(String(password), 10), createdAt: Date.now() };
  await users.create(user);
  return { token: signToken(user), email };
}

export async function login(emailRaw, password) {
  const email = normalizeEmail(emailRaw);
  const user = await users.findByEmail(email);
  if (!user || !bcrypt.compareSync(String(password || ""), user.hash)) {
    throw new AppError(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }
  return { token: signToken(user), email };
}
