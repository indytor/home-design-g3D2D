// Persistence แบบไฟล์ JSON (ไม่มี native dependency — Docker build เสถียร)
// เก็บใน DATA_DIR (ค่าเริ่มต้น ./data) ซึ่งควร mount เป็น volume เพื่อให้ข้อมูลคงอยู่
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function file(name) {
  return path.join(DATA_DIR, name + ".json");
}

// อ่านทั้งคอลเลกชัน (คืน [] ถ้ายังไม่มีไฟล์)
export async function readAll(name) {
  await ensureDir();
  try {
    const raw = await fs.readFile(file(name), "utf8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

// เขียนแบบ atomic (เขียนไฟล์ชั่วคราวแล้ว rename) กันไฟล์พังถ้าดับกลางคัน
export async function writeAll(name, arr) {
  await ensureDir();
  const tmp = file(name) + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(arr, null, 2), "utf8");
  await fs.rename(tmp, file(name));
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
