// Vercel Serverless Function — AI ช่วยงานรายงานหน้างาน (วิเคราะห์ภาพด้วย Vision)
// ซ่อน OpenAI API key ไว้ฝั่งเซิร์ฟเวอร์ (Environment Variable: OPENAI_API_KEY)
//
// รับ POST body: { task, reportText, spec, images:[dataURL...] }
//   task = "draft"   → ร่างสรุปสถานะโครงการจากข้อมูล + รูป
//   task = "inspect" → ตรวจงานก่อสร้างตามหลักวิศวกรรม/แบบ (เทียบ spec ถ้ามี)
//   task = "plan"    → ประเมิน/เตือนความเสี่ยงของแผนงาน
// ตอบกลับ: { text }

const SYSTEM = {
  draft:
    "คุณเป็นวิศวกรสนาม (Site Engineer) ผู้เชี่ยวชาญงานก่อสร้างบ้านพักอาศัย " +
    "เขียนสรุป 'สถานะโครงการ' เป็นภาษาไทยเชิงวิชาชีพ กระชับ 2-4 ประโยค " +
    "อ้างอิงจากข้อมูลความก้าวหน้า ปัญหา และแผนงานที่ให้มา (และรูปถ้ามี) " +
    "ให้เหมาะกับการรายงานผู้ควบคุมงาน ไม่ต้องใส่หัวข้อหรือ bullet ส่งเฉพาะเนื้อความสรุป",
  inspect:
    "คุณเป็นวิศวกรโยธา/ผู้ตรวจงานก่อสร้าง (QA/QC) วิเคราะห์รูปถ่ายหน้างานที่แนบมา " +
    "ตรวจความถูกต้องของงานตามหลักวิศวกรรมและแบบมาตรฐานงานโครงสร้าง (ฐานราก ตอม่อ คานคอดิน เหล็กเสริม ระยะหุ้มคอนกรีต การผูกเหล็ก ระดับ ฯลฯ) " +
    "ถ้ามีข้อความ 'แบบ/สเปคอ้างอิง' ให้เทียบกับสิ่งที่เห็นในรูป " +
    "ตอบเป็นภาษาไทย จัดเป็นหัวข้อ: 1) สิ่งที่ถูกต้อง 2) จุดที่ควรตรวจสอบ/อาจไม่เป็นไปตามแบบ 3) ข้อเสนอแนะแก้ไข " +
    "ระบุชัดเจนว่าวิเคราะห์จากภาพเท่านั้น เป็นการตรวจเบื้องต้น ไม่ทดแทนการตรวจหน้างานจริง",
  plan:
    "คุณเป็นผู้จัดการโครงการก่อสร้าง (Construction PM) " +
    "ประเมินแผนงานวันถัดไปและสถานะที่ให้มา เทียบกับความก้าวหน้าและปัญหา/อุปสรรค (เช่น ฝน ดินแฉะ เครื่องจักรเข้าไม่ได้) " +
    "ตอบเป็นภาษาไทย จัดเป็นหัวข้อ: 1) ความเหมาะสมของแผน 2) ความเสี่ยง/ผลกระทบที่อาจเกิด 3) ข้อเสนอแนะปรับแผน/ลำดับงาน/ทรัพยากร " +
    "เน้นปฏิบัติได้จริง กระชับ"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า OPENAI_API_KEY บนเซิร์ฟเวอร์" });
  }
  try {
    const { task = "inspect", reportText = "", spec = "", images = [] } = req.body || {};
    const system = SYSTEM[task] || SYSTEM.inspect;

    // ประกอบข้อความบริบท
    let ctx = "ข้อมูลรายงานหน้างาน:\n" + (reportText || "(ไม่มี)");
    if (spec && spec.trim()) {
      ctx += "\n\nแบบ/สเปคอ้างอิงสำหรับตรวจเทียบ:\n" + spec.trim();
    }
    if (Array.isArray(images) && images.length) {
      ctx += "\n\n(แนบรูปถ่ายหน้างาน " + images.length + " รูปด้านล่าง)";
    }

    // เนื้อหา user แบบ multimodal
    const content = [{ type: "text", text: ctx }];
    (Array.isArray(images) ? images.slice(0, 6) : []).forEach(src => {
      if (typeof src === "string" && src.startsWith("data:image")) {
        content.push({ type: "image_url", image_url: { url: src } });
      }
    });

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: system },
          { role: "user", content }
        ],
        temperature: 0.4,
        max_tokens: 1200
      })
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : "เรียก OpenAI ไม่สำเร็จ";
      return res.status(r.status).json({ error: msg });
    }
    const text = data && data.choices && data.choices[0] && data.choices[0].message
      && data.choices[0].message.content ? data.choices[0].message.content.trim() : "";
    if (!text) {
      return res.status(502).json({ error: "ไม่ได้รับผลลัพธ์จาก OpenAI" });
    }
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "เซิร์ฟเวอร์ผิดพลาด: " + (e.message || String(e)) });
  }
}
