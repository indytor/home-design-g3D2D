# AI Architectural Prompt Generator — เชื่อม OpenAI สร้างภาพ

โครงสร้างไฟล์
- `index.html` — โปรแกรมหลัก (หน้าเว็บ) — มีโหมด: ออกแบบ/สร้างภาพ, ประมาณราคา BOQ, **รายงานหน้างาน**, บันทึกงาน, วิธีใช้
- `api/generate-image.js` — backend สร้างภาพ ซ่อน API key (Vercel Serverless Function)
- `api/analyze.js` — backend AI วิเคราะห์ภาพหน้างาน (ตรวจงานตามแบบ / ประเมินแผน / ร่างสรุปสถานะ)
- `vercel.json` — ตั้งค่า deploy

## 📋 โหมดรายงานหน้างาน (Site Progress Report)
ระบบบันทึกและสร้างรายงานความก้าวหน้างานก่อสร้างประจำวัน (Executive Summary) สำหรับส่งผู้ควบคุมงาน/ลงโซเชียล
- กรอก: ข้อมูลโครงการ, ความก้าวหน้าประจำวัน, ปัญหา/อุปสรรค, แผนงานวันถัดไป, สถานะโครงการ, แฮชแท็ก
- แนบรูปหน้างานได้หลายรูป (ย่อขนาดอัตโนมัติในเครื่อง)
- สร้างรายงานรูปแบบมาตรฐาน → คัดลอก / ดาวน์โหลด .txt / **ส่งออก PDF** (พร้อมรูป+ผล AI) / บันทึกประวัติ (localStorage)
- 📊 **Dashboard ภาพรวม**: % ความก้าวหน้าล่าสุด, จำนวนรายงาน/วัน, ปัญหาสะสม และกราฟ S-curve จากรายงานที่บันทึก
- 🤖 **AI ช่วยงาน** (ต้อง deploy บน Vercel ที่ตั้ง `OPENAI_API_KEY` แล้ว):
  - **AI ร่างสรุปสถานะ** — ร่างข้อความสรุปสถานะโครงการให้อัตโนมัติ
  - **AI ตรวจงานตามแบบ** — วิเคราะห์รูปถ่าย ตรวจงานโครงสร้างตามหลักวิศวกรรม/แบบที่อ้างอิง (QA/QC เบื้องต้น)
  - **AI ประเมินแผนงาน** — ประเมินความเหมาะสม/ความเสี่ยงของแผน และเสนอแนะการปรับแผน

  - **อัปโหลดแบบก่อสร้าง (PDF/รูป)** — แนบแบบให้ AI เทียบรูปหน้างานกับแบบจริง (PDF แปลงเป็นรูปด้วย pdf.js)

  > หมายเหตุ: การตรวจด้วย AI เป็นการประเมินจากภาพเบื้องต้น ไม่ทดแทนการตรวจหน้างานจริงโดยวิศวกร

## 🐳 Self-host backend (Docker) — สำหรับเก็บข้อมูลบนเซิร์ฟเวอร์ของคุณ + ล็อกอินผู้ใช้
นอกจาก deploy บน Vercel (static) แล้ว ยังรันเป็นระบบเต็มบนคลาวด์/โดเมนของคุณเองได้ด้วย Docker:
```bash
cp .env.example .env   # กรอก JWT_SECRET และ OPENAI_API_KEY
docker compose up -d --build
# เปิด http://<server>:8080
```
ได้: ล็อกอินผู้ใช้ (JWT), เก็บรายงานบนเซิร์ฟเวอร์, ซิงค์คลาวด์ (ปุ่ม ⬆️/⬇️ ในแท็บรายงาน), และพร็อกซี AI
รายละเอียดทั้งหมดดูที่ [`server/README.md`](server/README.md)

> โครงสร้าง backend เป็น **3 เทียร์** (API → Business → Data) ดู [`ARCHITECTURE.md`](ARCHITECTURE.md)

## 🧩 Microservices (สเกลแยกส่วน)
นอกจาก monolith แล้ว ยังมี stack แบบ **microservices** (gateway + auth + reports + ai) รันได้จริง:
```bash
cp .env.example .env
docker compose -f docker-compose.microservices.yml up -d --build
# เปิด http://<server>:8080
```
ออกแบบ: [`MICROSERVICES.md`](MICROSERVICES.md) · โค้ด/วิธีใช้: [`services/README.md`](services/README.md)

## ขั้นตอน Deploy บน Vercel (ฟรี)

### 1) สมัคร OpenAI API + เติมเงิน + สร้าง key
1. ไปที่ https://platform.openai.com → สมัคร/เข้าสู่ระบบ
2. เมนู Billing → เติมเงิน (เริ่ม $5 ก็พอลองได้เยอะ)
3. เมนู API keys → Create new secret key → คัดลอกเก็บไว้ (ขึ้นต้น sk-...)
   *เก็บเป็นความลับ ห้ามใส่ในโค้ดหรือส่งให้ใคร*

### 2) อัปโค้ดขึ้น GitHub
1. สร้าง repo ใหม่ (Public หรือ Private ก็ได้)
2. อัปโหลดทั้ง 3 ไฟล์ + โฟลเดอร์ api/ ขึ้นไป (รักษาโครงสร้างโฟลเดอร์)

### 3) Deploy ที่ Vercel
1. ไปที่ https://vercel.com → Sign up ด้วย GitHub
2. Add New → Project → เลือก repo ที่เพิ่งสร้าง → Import
3. **สำคัญ:** ก่อนกด Deploy ไปที่ Environment Variables เพิ่ม:
   - Name: `OPENAI_API_KEY`
   - Value: (วาง key sk-... ของคุณ)
4. กด Deploy → รอสักครู่ จะได้ลิงก์ เช่น https://your-app.vercel.app

### 4) ใช้งาน
- เปิดลิงก์ Vercel → กรอกข้อมูล → กด "สร้างคำสั่ง" → กด "🎨 สร้างภาพด้วย AI"
- ช่อง "Backend URL" เว้นว่างไว้ (จะใช้ /api/generate-image ของโดเมนเดียวกันอัตโนมัติ)
- ได้ภาพแล้วกด "ดาวน์โหลดภาพ"

## ค่าใช้จ่ายโดยประมาณ (gpt-image-1)
- คุณภาพ low ~ $0.01–0.02 / ภาพ
- คุณภาพ medium ~ $0.04 / ภาพ
- คุณภาพ high ~ $0.07–0.19 / ภาพ (ขึ้นกับขนาด)
ตรวจราคาล่าสุดที่ https://openai.com/api/pricing เสมอ

## ความปลอดภัย
- API key อยู่ใน Environment Variable บนเซิร์ฟเวอร์ Vercel เท่านั้น ผู้ใช้เว็บมองไม่เห็น
- ห้ามใส่ key ลงใน index.html เด็ดขาด
- แนะนำตั้ง Usage limits ใน OpenAI กันค่าใช้จ่ายบานปลาย
