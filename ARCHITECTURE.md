# สถาปัตยกรรม 3 เทียร์ (3-Tier Architecture)

ระบบรายงานหน้างานออกแบบเป็น **3 ชั้น (tier)** แยกความรับผิดชอบชัดเจน
ชั้นกลาง (Application) แบ่งภายในเป็น **API layer** กับ **Business layer**
และชั้นล่าง (Data) ออกแบบให้สลับ JSON ↔ Postgres ได้โดยไม่กระทบชั้นบน

```
┌───────────────────────────────────────────────────────────┐
│ TIER 1 — PRESENTATION (Client)                            │
│   index.html  (โหมด "📋 รายงานหน้างาน": ฟอร์ม, dashboard, │
│   PDF, อัปโหลดแบบ, ล็อกอิน/ซิงค์)                          │
│   สื่อสารผ่าน  fetch → REST /api/*                         │
└─────────────────────────┬─────────────────────────────────┘
                          │  HTTP / JSON
┌─────────────────────────▼─────────────────────────────────┐
│ TIER 2 — APPLICATION                                       │
│                                                            │
│   ┌── API layer ──────────  server/api/                    │
│   │   routes.js            ผูกเส้นทาง                       │
│   │   *.controller.js      รับ req → เรียก service → res    │
│   │   middleware/auth.js   ตรวจ JWT                         │
│   │        │ เรียก                                          │
│   ┌──▼ Business layer ────  server/business/                │
│   │   auth.service.js      สมัคร/ล็อกอิน, JWT, bcrypt       │
│   │   reports.service.js   ตรรกะรายงาน, validation         │
│   │   ai.service.js        ออร์เคสเตรชัน + เรียก OpenAI     │
│   │        │ เรียกผ่าน repository interface                 │
└───┼────────┼───────────────────────────────────────────────┘
    │        │
┌───▼────────▼───────────────────────────────────────────────┐
│ TIER 3 — DATA                       server/db/              │
│   users.repo.js / reports.repo.js   (repository)           │
│   index.js                          เลือก adapter          │
│   jsonAdapter.js                    เก็บไฟล์ JSON (/data)   │
│   └─ อนาคต: postgresAdapter.js (interface เดียวกัน)        │
└────────────────────────────────────────────────────────────┘
```

## กฎการพึ่งพา (Dependency Rule)
ชั้นบนเรียกชั้นล่างได้ทางเดียว — **ห้ามเรียกย้อนขึ้น และห้ามข้ามชั้น**

| ชั้น | โฟลเดอร์ | หน้าที่ | พึ่งพา |
|------|----------|---------|--------|
| Presentation | `index.html` | UI, เรียก REST | — (HTTP) |
| API | `server/api/` | HTTP I/O, auth middleware, จัดรูป response | Business |
| Business | `server/business/` | ตรรกะธุรกิจ, validation, JWT, AI | Data (repo) |
| Data | `server/db/` | persistence, repository, adapter | — (ไฟล์/DB) |

จุดสำคัญ:
- **API ไม่มีตรรกะธุรกิจ** — แค่แปลง HTTP ↔ เรียก service (controller ใช้ `next(e)` ส่ง error)
- **Business ไม่รู้จัก HTTP** — โยน `AppError(status, msg)`; ไม่แตะ `req/res` และไม่อ่านไฟล์ตรง ๆ
- **Data ซ่อนวิธีเก็บ** — business เห็นแค่ repository (`findByEmail`, `listByUser`, …) จะเปลี่ยนเป็น Postgres ก็แก้แค่ adapter

## การประกอบและจัดการ error
- `server/server.js` = composition root: ต่อ middleware → mount `/api` → เสิร์ฟ static → error handler
- `config.js` = รวมค่าจาก env ที่เดียว (`PORT`, `JWT_SECRET`, `DATA_DIR`, `DB_DRIVER`, `OPENAI_API_KEY`)
- Error handler กลางแปลง `AppError.status` เป็น HTTP status และตอบ `{ error }` เสมอ

## เส้นทางตัวอย่าง (request flow)
`POST /api/auth/login`
1. **API** `routes.js` → `auth.controller.login` (อ่าน `req.body`)
2. **Business** `auth.service.login` → ตรวจรหัสผ่าน (bcrypt) → ออก JWT
3. **Data** `users.repo.findByEmail` → `jsonAdapter.readAll("users")`
4. ไหลกลับขึ้นเป็น `{ token, email }` หรือ error handler ตอบ `401`

## ขยายต่อในอนาคต (ไม่กระทบ API/Business)
- เพิ่ม `server/db/postgresAdapter.js` แล้วตั้ง `DB_DRIVER=postgres`
- ย้ายรูปจาก data URL ไป object storage โดยเพิ่ม repository/service ใหม่
- เพิ่มชั้นสิทธิ์ (เจ้าของ/ผู้ควบคุมงาน/ทีม) ที่ business layer
