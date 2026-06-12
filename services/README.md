# Microservices Stack

แตกระบบเป็น 4 บริการตาม [`../MICROSERVICES.md`](../MICROSERVICES.md) — ใช้งานได้จริง

```
services/
  shared/     lib ใช้ร่วม (AppError, jwt, jsonAdapter) — ถูก COPY เข้าแต่ละอิมเมจตอน build
  gateway/    :8080  จุดเข้าเดียว: เสิร์ฟ frontend + routing + rate-limit + X-Request-Id
  auth/       :8081  สมัคร/ล็อกอิน, ออก JWT        (DB: users)
  reports/    :8082  CRUD/sync รายงาน (ตรวจ JWT เอง) (DB: reports)
  ai/         :8083  พร็อกซี OpenAI (วิเคราะห์/สร้างภาพ) — stateless
```

แต่ละบริการเป็นโครง 3 เทียร์ย่อ (API → Business → Data) เป็นอิสระต่อกัน และ **มีฐานข้อมูลของตัวเอง**
(database-per-service) — auth ถือ `users`, reports ถือ `reports` แยก volume กัน

## รัน (Docker Compose)
```bash
cp .env.example .env          # กรอก JWT_SECRET และ OPENAI_API_KEY
docker compose -f docker-compose.microservices.yml up -d --build
# เปิด http://<server>:8080
```
สเกลเฉพาะ AI เมื่อโหลดสูง:
```bash
docker compose -f docker-compose.microservices.yml up -d --scale ai=3
```

## การไหลของ request
- Client เรียก `/api/*` ที่ **gateway** เท่านั้น (ไม่รู้จักบริการภายใน)
- gateway ตัด prefix `/api` แล้ว proxy: `/api/auth/*`→auth, `/api/reports*`→reports, `/api/analyze`/`/api/generate-image`→ai
- **auth** เซ็น JWT (HS256, `JWT_SECRET` ร่วม) — **reports** ตรวจ token เองในเครื่อง ไม่ต้องเรียก auth ทุกครั้ง
- ตรวจสุขภาพแต่ละบริการที่ `/health` (เช่น `http://auth:8081/health` ภายในเครือข่าย)

## ทดสอบเร็ว (ผ่าน gateway)
```bash
G=http://localhost:8080
TOKEN=$(curl -s -X POST $G/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"secret1"}' | jq -r .token)
curl -s -X PUT $G/api/reports -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"reports":[{"project":"บ้าน 4 หลัง","percent":30}]}'
curl -s $G/api/reports -H "Authorization: Bearer $TOKEN"
```

## เทียบกับ monolith
- monolith เดิม (`../server/`) ยังใช้งานได้ ([`../docker-compose.yml`](../docker-compose.yml)) — เหมาะเริ่มต้น/สเกลเล็ก
- stack นี้เหมาะเมื่อต้องสเกลแยกส่วน (โดยเฉพาะ AI) หรือแยกทีม deploy
- frontend (`index.html`) ตัวเดียวกัน ใช้ได้ทั้งสองแบบเพราะเรียก `/api/*` เหมือนกัน

## ก้าวต่อไป (production)
- อัป JWT เป็น **RS256 + JWKS** (auth ถือ private key, บริการอื่นดึง public key)
- ย้าย DB แต่ละบริการเป็น **Postgres** ของตัวเอง
- ย้ายรูป/แบบไป **object storage** (เพิ่ม media-service)
- ขึ้น **Kubernetes** + HPA ต่อบริการ, Ingress ทำ TLS/โดเมน, รวม log/metrics/tracing
