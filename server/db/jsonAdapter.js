// Data adapter: persistence แบบไฟล์ JSON (ไม่มี native dependency)
// อยู่ในชั้น Data tier — repository เรียกผ่าน interface นี้
// อนาคตจะเพิ่ม postgresAdapter.js ที่มี readAll/writeAll/genId เหมือนกัน แล้วสลับใน db/index.js
import { promises as fs } from "fs";
import path from "path";
import { config } from "../config.js";

async function ensureDir() {
  await fs.mkdir(config.dataDir, { recursive: true });
}
function file(name) {
  return path.join(config.dataDir, name + ".json");
}

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

// เขียนแบบ atomic (temp + rename) กันไฟล์พังถ้าโปรเซสดับกลางคัน
export async function writeAll(name, arr) {
  await ensureDir();
  const tmp = file(name) + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(arr, null, 2), "utf8");
  await fs.rename(tmp, file(name));
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
