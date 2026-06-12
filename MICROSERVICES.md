# การออกแบบ Microservices (Site Report Platform)

เอกสารนี้ออกแบบการแตก monolith 3 เทียร์ปัจจุบัน (`server/`) ออกเป็น **microservices**
ตามขอบเขตธุรกิจ (bounded context) โดยอาศัยว่าแต่ละโดเมนใน `server/business/` + `server/db/`
ถูกแยกชั้นไว้แล้ว จึงยกออกเป็น service อิสระได้ทันที

> สรุปคำแนะนำ: สำหรับสเกลปัจจุบัน (ผู้รับเหมา/โครงการจำนวนหนึ่ง) **modular monolith ที่มีอยู่ก็เพียงพอ**
> แต่ออกแบบ microservice ไว้เพื่อรองรับการขายเป็นระบบหลายผู้ใช้/หลายทีม และสเกลแยกส่วน (โดยเฉพาะ AI ที่กินทรัพยากร)

---

## 1. ภาพรวมสถาปัตยกรรม

```
                         ┌──────────────────────────┐
        Browser ───────► │   API GATEWAY  (:8080)    │  เสิร์ฟ frontend (index.html)
        (index.html)     │  - routing /api/*         │  + ตรวจ/ส่งผ่าน JWT
                         │  - rate limit, CORS, log  │
                         └───┬──────────┬────────┬───┘
              /api/auth/*    │          │        │   /api/analyze, /api/generate-image
              ┌──────────────▼─┐  /api/reports/* ┌▼─────────────────┐
              │ AUTH SERVICE   │  ┌───────────▼─┐ │  AI SERVICE      │
              │  (:8081)       │  │ REPORTS SVC │ │  (:8083)         │
              │  สมัคร/ล็อกอิน  │  │  (:8082)    │ │  พร็อกซี OpenAI   │
              │  ออก JWT        │  │ CRUD/sync   │ │  (stateless)     │
              └───────┬────────┘  └──────┬──────┘ └────────┬─────────┘
                      │                  │                 │ (เรียก OpenAI ภายนอก)
                ┌─────▼─────┐      ┌──────▼──────┐          ▼
                │ users DB  │      │ reports DB  │     api.openai.com
                └───────────┘      └─────────────┘
                  (DB ต่อ service — database per service)

        (ออปชัน) MEDIA SERVICE (:8084) → object storage (S3/MinIO) สำหรับรูป/แบบ
        (ออปชัน) EVENT BUS (NATS/Redis) สำหรับเหตุการณ์ async เช่น report.created
```

---

## 2. ขอบเขตแต่ละ Service

| Service | ความรับผิดชอบ | ข้อมูลที่ถือครอง | สถานะ | สเกล |
|---------|----------------|------------------|-------|------|
| **api-gateway** | จุดเข้าเดียว, routing, auth check, rate-limit, CORS, เสิร์ฟ frontend | — | stateless | แนวนอน |
| **auth-service** | สมัคร/ล็อกอิน, ออก/ต่ออายุ JWT, จัดการผู้ใช้ | `users` | stateful | แนวนอน + DB replica |
| **reports-service** | รายงาน/โครงการต่อผู้ใช้ (CRUD, sync, dashboard data) | `reports`, `projects` | stateful | แนวนอน + DB |
| **ai-service** | วิเคราะห์ภาพ (ตรวจงาน/ประเมินแผน/ร่างสรุป), สร้างภาพ | — (ไม่เก็บ) | stateless | แนวนอน (แยก scale ตามโหลด AI) |
| **media-service** *(ออปชัน)* | อัปโหลด/เสิร์ฟรูปหน้างาน + แบบ PDF | object storage | stateless + storage | แนวนอน |

**หลักการ:** หนึ่ง service = หนึ่ง bounded context + ฐานข้อมูลของตัวเอง (database-per-service)
ห้าม service หนึ่งเข้าถึง DB ของอีก service ตรง ๆ — ต้องผ่าน API/เหตุการณ์เท่านั้น

---

## 3. การถือครองข้อมูล (Data Ownership)
- **auth-service → users**: `{ id, email, hash, createdAt, role }`
- **reports-service → reports, projects**: `{ id, userId, projectId, date, day, percent, phase, progress[], issues[], plan[], status, photos[]|mediaRefs[], savedAt }`
- **ai-service**: ไม่มีฐานข้อมูลถาวร (อาจมี cache ผลวิเคราะห์ระยะสั้น)
- `userId` คือ key อ้างอิงข้ามบริการ (ได้จาก JWT) — reports-service ไม่ join ตาราง users แต่ใช้ `userId` จาก token

> เหตุผล: แยก DB ทำให้แต่ละ service deploy/สเกล/เปลี่ยน schema ได้อิสระ และจำกัดความเสียหายเมื่อ service ใดล่ม

---

## 4. การสื่อสาร (Communication)

**Client → ระบบ:** ผ่าน gateway เป็น REST/JSON เท่านั้น (client ไม่รู้จัก service ภายใน)

**Auth ข้ามบริการ (สำคัญ):** ใช้ **JWT แบบ stateless** เพื่อเลี่ยงการเรียกตรวจสิทธิ์ถี่ ๆ
- auth-service เซ็น token; service อื่น **ตรวจ token เองในเครื่อง** (ไม่ต้องเรียก auth ทุก request)
- แนะนำ **RS256**: auth-service ถือ private key, service อื่นถือ public key (เผยแพร่ผ่าน JWKS endpoint)
  → หมุนคีย์ได้โดยไม่ต้องแจกความลับร่วมกัน
- เริ่มเร็วได้ด้วย **HS256 + shared secret** (`JWT_SECRET` ร่วมกัน) แล้วค่อยอัปเป็น RS256

**Service ↔ Service:** ออกแบบให้ **loosely coupled** — ปัจจุบันแทบไม่ต้องคุยกันเลย
- ถ้าต้องการ async (เช่น report.created → แจ้งเตือน/สรุปรายสัปดาห์) ใช้ **event bus** (NATS/Redis Stream/RabbitMQ)
  publish event, ผู้สนใจ subscribe — ไม่เรียกตรงเพื่อลด coupling

**Service discovery:** ใช้ DNS ของ Docker Compose / Kubernetes (เรียกด้วยชื่อ service เช่น `http://auth-service:8081`)

---

## 5. API Contract (สรุป)
```
api-gateway (public, :8080)
  GET   /                         → เสิร์ฟ index.html
  *     /api/auth/*               → proxy auth-service
  *     /api/reports*             → proxy reports-service   (ต้องมี Bearer JWT)
  POST  /api/analyze              → proxy ai-service
  POST  /api/generate-image       → proxy ai-service

auth-service (:8081)
  POST  /auth/register  {email,password} → {token,email}
  POST  /auth/login     {email,password} → {token,email}
  GET   /.well-known/jwks.json            → public keys (กรณี RS256)
  GET   /health

reports-service (:8082)   [ตรวจ JWT → req.user.uid]
  GET    /reports             → [report...]
  PUT    /reports  {reports}  → {ok,count}    (sync แทนที่ทั้งชุดของผู้ใช้)
  POST   /reports  {...}      → report
  DELETE /reports/:id         → {ok,removed}
  GET    /health

ai-service (:8083)
  POST  /analyze        {task,reportText,spec,images,planImages} → {text}
  POST  /generate-image {prompt,size,quality}                    → {image,usedPrompt}
  GET   /health
```
สัญญานี้ **เหมือน endpoint เดิมทุกประการ** → frontend ไม่ต้องแก้ (ยังเรียก `/api/*` ที่ gateway)

---

## 6. โครงสร้าง Repo (เป้าหมาย)
```
services/
  gateway/        server.js (http-proxy + static + auth check + rate limit)
  auth/           api/ business/ db/   (ยกจาก server/business/auth.* + db/users.*)
  reports/        api/ business/ db/   (ยกจาก server/business/reports.* + db/reports.*)
  ai/             api/ business/       (ยกจาก server/business/ai.*  — ไม่มี db)
  shared/         AppError, jwt utils, jsonAdapter (publish เป็น lib ภายใน)
docker-compose.yml   (ประกอบทุก service + volume + network)
```
> โค้ดในแต่ละ service คือโครง 3 เทียร์ย่อ ๆ (API→Business→Data) ที่เรามีอยู่แล้ว — แค่หั่นตามโดเมน

---

## 7. ตัวอย่าง docker-compose (ย่อ)
```yaml
services:
  gateway:
    build: ./services/gateway
    ports: ["8080:8080"]
    environment: [JWT_PUBLIC_KEY, AUTH_URL=http://auth:8081, REPORTS_URL=http://reports:8082, AI_URL=http://ai:8083]
    depends_on: [auth, reports, ai]

  auth:
    build: ./services/auth
    environment: [JWT_PRIVATE_KEY, DATA_DIR=/data]
    volumes: ["auth-data:/data"]          # หรือ Postgres ของ auth

  reports:
    build: ./services/reports
    environment: [JWT_PUBLIC_KEY, DATA_DIR=/data]
    volumes: ["reports-data:/data"]       # หรือ Postgres ของ reports

  ai:
    build: ./services/ai
    environment: [OPENAI_API_KEY]
    deploy: { replicas: 2 }               # สเกล AI แยกตามโหลด

volumes: { auth-data: {}, reports-data: {} }
```
Production: ย้ายไป **Kubernetes** (Deployment + Service + HPA ต่อ microservice), Ingress ทำ TLS/โดเมน,
แต่ละ service มี Postgres ของตัวเอง (instance/namespace แยก)

---

## 8. Cross-cutting Concerns
- **Security**: gateway ทำ rate-limit + CORS; JWT ตรวจที่ขอบ (gateway) และซ้ำที่ service (defense in depth); secret/คีย์อยู่ใน vault/env
- **Observability**: ทุก service มี `/health`; ใส่ `X-Request-Id` ที่ gateway แล้วส่งต่อ; รวม log (Loki/ELK) + metrics (Prometheus) + tracing (OpenTelemetry)
- **Resilience**: timeout + retry + circuit breaker ที่ gateway เมื่อเรียก service; AI ตั้ง timeout ยาวกว่า (งานภาพช้า)
- **Config**: ค่าทั้งหมดจาก env (12-factor); ไม่ฝัง secret ในอิมเมจ
- **CI/CD**: build/test/deploy แยกต่อ service (deploy AI ใหม่ไม่กระทบ auth)

---

## 9. เส้นทางย้าย (Strangler Pattern — ทำทีละขั้น ไม่ล้มของเดิม)
1. **วาง gateway** หน้า monolith ปัจจุบัน (proxy ทุกอย่างไป `server/` เดิม) — ภายนอกไม่รู้สึกถึงการเปลี่ยน
2. **แยก ai-service** ก่อน (stateless ง่ายสุด, ได้ประโยชน์สเกลทันที) → gateway ชี้ `/api/analyze`,`/api/generate-image` ไป service ใหม่
3. **แยก auth-service** (ยก `business/auth` + `db/users`) → เปลี่ยนเป็น RS256 + JWKS
4. **แยก reports-service** (ยก `business/reports` + `db/reports`) เป็นบริการสุดท้าย
5. แต่ละขั้นย้าย DB ของโดเมนนั้นออกเป็นของตัวเอง; เมื่อครบ ปลด monolith ทิ้ง

---

## 10. ข้อแลกเปลี่ยน (Trade-offs)
| ได้ | เสีย |
|-----|------|
| สเกลแยกส่วน (โดยเฉพาะ AI) | ความซับซ้อน deploy/เครือข่าย/observability สูงขึ้น |
| Deploy/พัฒนาแยกทีมได้ | ต้องจัดการ distributed data / eventual consistency |
| จำกัดความเสียหายเมื่อ service ล่ม | latency เพิ่มจาก network hop |
| เลือกเทคต่อ service ได้ | ต้องมี DevOps/CI-CD ที่พร้อม |

**คำแนะนำเชิงปฏิบัติ:** เริ่มที่ modular monolith (ปัจจุบัน) → แยก **ai-service** เป็นตัวแรกเมื่อโหลด AI สูง
→ ค่อยแยก auth/reports เมื่อมีผู้ใช้/ทีมจำนวนมาก ตาม Strangler ข้างบน
