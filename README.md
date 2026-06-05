# AI Architectural Prompt Generator — เชื่อม OpenAI สร้างภาพ

โครงสร้างไฟล์
- `index.html` — โปรแกรมหลัก (หน้าเว็บ)
- `api/generate-image.js` — backend ซ่อน API key (Vercel Serverless Function)
- `vercel.json` — ตั้งค่า deploy

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
