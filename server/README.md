# Site Report Server (self-host ด้วย Docker)

Backend สำหรับระบบรายงานหน้างาน — เสิร์ฟหน้าเว็บ + เก็บรายงานบนเซิร์ฟเวอร์ของคุณเอง + พร็อกซี AI
(เหมาะกับการรันบนคลาวด์/โดเมนของคุณ ด้วย Docker)

## ฟีเจอร์
- เสิร์ฟ frontend (`index.html`) ที่ `/`
- สมัคร/เข้าสู่ระบบ ด้วย JWT — `POST /api/auth/register`, `POST /api/auth/login`
- จัดการรายงานต่อผู้ใช้ — `GET/PUT/POST /api/reports`, `DELETE /api/reports/:id` (ต้องแนบ `Authorization: Bearer <token>`)
- พร็อกซี AI — `POST /api/analyze`, `POST /api/generate-image` (ใช้ `OPENAI_API_KEY` ฝั่งเซิร์ฟเวอร์)
- เก็บข้อมูลเป็นไฟล์ JSON ใน `DATA_DIR` (mount volume `/data`) — ไม่มี native dependency

## รันด้วย Docker Compose (แนะนำ)
1. ที่ root ของโปรเจค คัดลอก env: `cp .env.example .env` แล้วกรอก
   - `JWT_SECRET` — สุ่มยาวๆ เช่น `openssl rand -hex 32`
   - `OPENAI_API_KEY` — คีย์ OpenAI (สำหรับฟีเจอร์ AI)
2. `docker compose up -d --build`
3. เปิด `http://<server-ip>:8080` → ไปแท็บ “📋 รายงานหน้างาน”

ข้อมูลทั้งหมดเก็บใน Docker volume `site-report-data` (คงอยู่แม้รีสตาร์ต)

## รันด้วย Docker ตรงๆ
```bash
docker build -t site-report .
docker run -d -p 8080:8080 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e OPENAI_API_KEY="sk-..." \
  -v site-report-data:/data \
  --name site-report site-report
```

## รันแบบ dev (ไม่ใช้ Docker)
```bash
cd server && npm install
JWT_SECRET=dev OPENAI_API_KEY=sk-... PORT=8080 DATA_DIR=./data node server.js
```

## ตั้งโดเมน + HTTPS
แนะนำวาง reverse proxy (Nginx / Caddy / Traefik) หน้า container เพื่อทำ TLS
ตัวอย่าง Caddyfile:
```
report.yourdomain.com {
    reverse_proxy localhost:8080
}
```

## หมายเหตุ
- เพิ่ม limit ของ request body เป็น 30MB เพื่อรองรับรูปฝังแบบ data URL — ถ้าใช้รูปจำนวนมาก
  ควรย้ายไปเก็บไฟล์แยก/Object storage ในเฟสถัดไป
- persistence แบบไฟล์ JSON เหมาะกับผู้ใช้ระดับเล็ก–กลาง ถ้าจะสเกลใหญ่
  ค่อยเปลี่ยน `store.js` ไปใช้ Postgres ได้โดยไม่กระทบ API
