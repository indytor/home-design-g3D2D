# 🚀 QUICKSTART — รัน Local → Docker Desktop → Cloud

คู่มือนำระบบ "รายงานหน้างาน" ขึ้นทีละขั้นตามแผน — เลือกใช้ **monolith** (`server/`) เป็นหลัก
เพราะคอนเทนเนอร์เดียวได้ครบ: เสิร์ฟหน้าเว็บ + ล็อกอิน + รายงาน + AI

> ต้องมีค่า 2 ตัวสำหรับฟีเจอร์เต็ม:
> - `JWT_SECRET` — คีย์ลับเซ็นโทเคน (สุ่มยาว ๆ)
> - `OPENAI_API_KEY` — คีย์ OpenAI (สำหรับ AI ตรวจงาน/ประเมินแผน/สร้างภาพ)
>
> สร้าง JWT_SECRET แบบข้ามแพลตฟอร์ม (มี Node อยู่แล้ว):
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

ก่อนเริ่มทุกขั้น ให้สร้างไฟล์ `.env` ที่ราก repo จากตัวอย่าง:
```bash
cp .env.example .env      # Windows: copy .env.example .env
```
แล้วเปิดแก้ใส่ค่า `JWT_SECRET` กับ `OPENAI_API_KEY`

---

## 🟢 ขั้น 1 — รัน Local ในเครื่อง (Node)
เหมาะกับพัฒนา/ทดสอบเร็ว ๆ ไม่ต้องมี Docker

**ต้องมี:** Node.js 18+ ([nodejs.org](https://nodejs.org))

```bash
cd server
npm install
npm start
```
เปิดเบราว์เซอร์: **http://localhost:8080** → ไปแท็บ "📋 รายงานหน้างาน"

- ระบบจะอ่าน `.env` ที่รากโปรเจกต์อัตโนมัติ (รองรับ dotenv แล้ว)
- ข้อมูลเก็บที่ `server/data/` (ไฟล์ JSON)
- หยุด: กด `Ctrl + C`

> ทดสอบเฉพาะหน้าเว็บล้วน ๆ โดยไม่รัน backend ก็ได้ — ดับเบิลคลิกเปิด `index.html`
> (ฟอร์ม/Dashboard/PDF ใช้ได้ แต่ AI กับซิงค์คลาวด์ต้องมี backend)

---

## 🐳 ขั้น 2 — Docker Desktop (แพ็กเป็นคอนเทนเนอร์)
เหมาะกับทดสอบให้เหมือน production ในเครื่องตัวเอง

**ต้องมี:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) ติดตั้งและเปิดอยู่

```bash
# จากรากโปรเจกต์ (มี .env แล้ว)
docker compose up -d --build
```
เปิด: **http://localhost:8080**

คำสั่งที่ใช้บ่อย:
```bash
docker compose logs -f          # ดู log สด
docker compose ps               # ดูสถานะ + healthcheck
docker compose down             # หยุด (ข้อมูลยังอยู่ใน volume)
docker compose up -d --build    # rebuild หลังแก้โค้ด
```
- ข้อมูลคงอยู่ใน Docker volume ชื่อ `site-report-data` (ไม่หายแม้ลบคอนเทนเนอร์)
- มี healthcheck ในตัว — `docker compose ps` จะเห็นสถานะ `healthy`

**(ทางเลือก) รันแบบ microservices** — gateway + auth + reports + ai แยกคอนเทนเนอร์:
```bash
docker compose -f docker-compose.microservices.yml up -d --build
# สเกลเฉพาะ AI:  docker compose -f docker-compose.microservices.yml up -d --scale ai=3
```

---

## ☁️ ขั้น 3 — ขึ้น Cloud ของคุณ (Production)
รันบน VM/เซิร์ฟเวอร์ของคุณด้วย Docker เหมือนขั้น 2 แต่เพิ่มเรื่องโดเมน + HTTPS + ความปลอดภัย

**1) เตรียมเครื่อง** — ติดตั้ง Docker + Docker Compose plugin บนเซิร์ฟเวอร์

**2) นำโค้ดขึ้นเครื่อง** — `git clone` หรือ push image ขึ้น registry (เช่น Docker Hub / GHCR) แล้ว pull
```bash
git clone <repo> && cd home-design-g3d2d
cp .env.example .env     # ใส่ JWT_SECRET ที่สุ่มจริง + OPENAI_API_KEY
docker compose up -d --build
```

**3) ตั้งโดเมน + HTTPS** — วาง reverse proxy หน้าคอนเทนเนอร์ (พอร์ต 8080)
ตัวอย่าง **Caddy** (ออก TLS อัตโนมัติ) — `Caddyfile`:
```
report.yourdomain.com {
    reverse_proxy localhost:8080
}
```
รัน: `caddy run` หรือใส่ Caddy เป็นอีก service ใน compose ก็ได้

**เช็กลิสต์ก่อนเปิดจริง**
- [ ] `JWT_SECRET` เป็นค่าสุ่มจริง (อย่าใช้ค่า default)
- [ ] ตั้ง `OPENAI_API_KEY` + ตั้ง usage limit ใน OpenAI กันค่าใช้จ่ายบานปลาย
- [ ] เปิดเฉพาะพอร์ต 80/443 ออกเน็ต ส่วน 8080 ให้อยู่หลัง proxy
- [ ] สำรองข้อมูล volume `site-report-data` เป็นระยะ
- [ ] (สเกลโต) ค่อยย้าย DB เป็น Postgres + แยก media ไป object storage (ดู `ARCHITECTURE.md`, `MICROSERVICES.md`)

---

## 🔍 ตรวจสุขภาพ / แก้ปัญหาเบื้องต้น
```bash
curl http://localhost:8080/api/health      # ควรได้ {"ok":true,...}
```
| อาการ | สาเหตุ/วิธีแก้ |
|-------|----------------|
| ปุ่ม AI ขึ้น error เรื่อง key | ยังไม่ได้ตั้ง `OPENAI_API_KEY` ใน `.env` แล้ว restart |
| ล็อกอิน/ซิงค์ไม่ทำงานเมื่อเปิดไฟล์ตรง ๆ | ต้องเปิดผ่าน backend (`localhost:8080`) ไม่ใช่ `file://` |
| พอร์ต 8080 ชนกัน | แก้ `PORT` ใน `.env` หรือแก้ port mapping ใน compose |
| ข้อมูลหายหลัง `docker compose down` | ปกติข้อมูลอยู่ใน volume — อย่าใช้ `down -v` (จะลบ volume) |
