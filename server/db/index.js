// เลือก data adapter ตาม config.dbDriver — ชั้น repository ใช้ผ่าน `store` เท่านั้น
// ทำให้สลับ JSON ↔ Postgres ได้โดยไม่กระทบ business/api tier
import { config } from "../config.js";
import * as jsonAdapter from "./jsonAdapter.js";

const adapters = {
  json: jsonAdapter
  // postgres: postgresAdapter   // เพิ่มในอนาคต
};

export const store = adapters[config.dbDriver] || jsonAdapter;
