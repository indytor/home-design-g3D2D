// Data adapter: persistence แบบไฟล์ JSON ต่อ service (DATA_DIR แยกของใครของมัน)
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}
function file(name) {
  return path.join(DATA_DIR, name + ".json");
}

export async function readAll(name) {
  await ensureDir();
  try {
    return JSON.parse((await fs.readFile(file(name), "utf8")) || "[]");
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

export async function writeAll(name, arr) {
  await ensureDir();
  const tmp = file(name) + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(arr, null, 2), "utf8");
  await fs.rename(tmp, file(name));
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
