// พร็อกซีเรียก OpenAI ฝั่งเซิร์ฟเวอร์ (ใช้ OPENAI_API_KEY จาก env)
// ใช้ logic เดียวกับ Vercel functions (api/analyze.js, api/generate-image.js)
// เพื่อให้ frontend เดิมทำงานได้ทั้งบน Vercel และ self-host Docker

const NO_TEXT_RULE =
  "ABSOLUTELY NO text, no letters, no Thai characters, no numbers, no labels, " +
  "no captions, no watermark, no dimension annotations, no title block, no signage. Pure visual only.";

const SYSTEM = {
  draft:
    "คุณเป็นวิศวกรสนาม (Site Engineer) ผู้เชี่ยวชาญงานก่อสร้างบ้านพักอาศัย " +
    "เขียนสรุป 'สถานะโครงการ' เป็นภาษาไทยเชิงวิชาชีพ กระชับ 2-4 ประโยค " +
    "อ้างอิงจากข้อมูลความก้าวหน้า ปัญหา และแผนงานที่ให้มา (และรูปถ้ามี) " +
    "ให้เหมาะกับการรายงานผู้ควบคุมงาน ไม่ต้องใส่หัวข้อหรือ bullet ส่งเฉพาะเนื้อความสรุป",
  inspect:
    "คุณเป็นวิศวกรโยธา/ผู้ตรวจงานก่อสร้าง (QA/QC) วิเคราะห์รูปถ่ายหน้างานที่แนบมา " +
    "ตรวจความถูกต้องของงานตามหลักวิศวกรรมและแบบมาตรฐานงานโครงสร้าง (ฐานราก ตอม่อ คานคอดิน เหล็กเสริม ระยะหุ้มคอนกรีต การผูกเหล็ก ระดับ ฯลฯ) " +
    "ถ้ามีรูป/ข้อความ 'แบบ/สเปคอ้างอิง' ให้เทียบกับสิ่งที่เห็นในรูปหน้างาน " +
    "ตอบเป็นภาษาไทย จัดเป็นหัวข้อ: 1) สิ่งที่ถูกต้อง 2) จุดที่ควรตรวจสอบ/อาจไม่เป็นไปตามแบบ 3) ข้อเสนอแนะแก้ไข " +
    "ระบุชัดเจนว่าวิเคราะห์จากภาพเท่านั้น เป็นการตรวจเบื้องต้น ไม่ทดแทนการตรวจหน้างานจริง",
  plan:
    "คุณเป็นผู้จัดการโครงการก่อสร้าง (Construction PM) " +
    "ประเมินแผนงานวันถัดไปและสถานะที่ให้มา เทียบกับความก้าวหน้าและปัญหา/อุปสรรค (เช่น ฝน ดินแฉะ เครื่องจักรเข้าไม่ได้) " +
    "ตอบเป็นภาษาไทย จัดเป็นหัวข้อ: 1) ความเหมาะสมของแผน 2) ความเสี่ยง/ผลกระทบที่อาจเกิด 3) ข้อเสนอแนะปรับแผน/ลำดับงาน/ทรัพยากร " +
    "เน้นปฏิบัติได้จริง กระชับ"
};

export async function analyze({ task = "inspect", reportText = "", spec = "", images = [], planImages = [] }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { status: 500, body: { error: "ยังไม่ได้ตั้งค่า OPENAI_API_KEY บนเซิร์ฟเวอร์" } };

  const system = SYSTEM[task] || SYSTEM.inspect;
  const siteImgs = (Array.isArray(images) ? images : []).filter(s => typeof s === "string" && s.startsWith("data:image")).slice(0, 6);
  const planImgs = (Array.isArray(planImages) ? planImages : []).filter(s => typeof s === "string" && s.startsWith("data:image")).slice(0, 4);

  let ctx = "ข้อมูลรายงานหน้างาน:\n" + (reportText || "(ไม่มี)");
  if (spec && spec.trim()) ctx += "\n\nแบบ/สเปคอ้างอิง (ข้อความ) สำหรับตรวจเทียบ:\n" + spec.trim();
  if (planImgs.length) {
    ctx += "\n\n*** มีรูป 'แบบก่อสร้าง' แนบมา " + planImgs.length + " หน้า (จะส่งก่อน) ตามด้วยรูป 'ถ่ายหน้างานจริง' " + siteImgs.length + " รูป ***\n" +
      "ให้เปรียบเทียบงานจริงในรูปหน้างานกับแบบก่อสร้างที่แนบ ว่าตรงตามแบบหรือไม่ และชี้จุดที่ไม่ตรง/ต้องตรวจสอบ";
  } else if (siteImgs.length) {
    ctx += "\n\n(แนบรูปถ่ายหน้างาน " + siteImgs.length + " รูปด้านล่าง)";
  }

  const content = [{ type: "text", text: ctx }];
  planImgs.forEach((src, i) => {
    content.push({ type: "text", text: "แบบก่อสร้าง หน้า " + (i + 1) + ":" });
    content.push({ type: "image_url", image_url: { url: src } });
  });
  siteImgs.forEach((src, i) => {
    if (planImgs.length) content.push({ type: "text", text: "รูปถ่ายหน้างานจริง รูปที่ " + (i + 1) + ":" });
    content.push({ type: "image_url", image_url: { url: src } });
  });

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "system", content: system }, { role: "user", content }],
      temperature: 0.4,
      max_tokens: 1200
    })
  });
  const data = await r.json();
  if (!r.ok) return { status: r.status, body: { error: (data?.error?.message) || "เรียก OpenAI ไม่สำเร็จ" } };
  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) return { status: 502, body: { error: "ไม่ได้รับผลลัพธ์จาก OpenAI" } };
  return { status: 200, body: { text } };
}

export async function generateImage({ prompt, size = "1024x1024", quality = "high" }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { status: 500, body: { error: "ยังไม่ได้ตั้งค่า OPENAI_API_KEY บนเซิร์ฟเวอร์" } };
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return { status: 400, body: { error: "ไม่มีคำสั่ง (prompt) หรือสั้นเกินไป" } };
  }
  const finalPrompt = (prompt.slice(0, 4000) + " " + NO_TEXT_RULE).slice(0, 4000);
  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-image-1", prompt: finalPrompt, size, quality, n: 1 })
  });
  const data = await r.json();
  if (!r.ok) return { status: r.status, body: { error: (data?.error?.message) || "เรียก OpenAI ไม่สำเร็จ" } };
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return { status: 502, body: { error: "ไม่ได้รับภาพกลับจาก OpenAI" } };
  return { status: 200, body: { image: `data:image/png;base64,${b64}`, usedPrompt: finalPrompt } };
}
