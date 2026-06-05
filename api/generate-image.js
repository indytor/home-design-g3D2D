// Vercel Serverless Function — ซ่อน OpenAI API key ไว้ฝั่งเซิร์ฟเวอร์
// ผู้ใช้ปลายทางมองไม่เห็น key (key อยู่ใน Environment Variable: OPENAI_API_KEY)
export default async function handler(req, res) {
  // อนุญาตเฉพาะ POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า OPENAI_API_KEY บนเซิร์ฟเวอร์" });
  }

  try {
    const { prompt, size = "1024x1024", quality = "high" } = req.body || {};
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return res.status(400).json({ error: "ไม่มีคำสั่ง (prompt) หรือสั้นเกินไป" });
    }
    // ตัดความยาวกันยิงข้อมูลใหญ่เกิน
    const safePrompt = prompt.slice(0, 4000);

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: safePrompt,
        size: size,
        quality: quality,
        n: 1
      })
    });

    const data = await r.json();
    if (!r.ok) {
      const msg = data?.error?.message || "เรียก OpenAI ไม่สำเร็จ";
      return res.status(r.status).json({ error: msg });
    }

    // gpt-image-1 ส่ง base64 กลับมาใน data[0].b64_json
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(502).json({ error: "ไม่ได้รับภาพกลับจาก OpenAI" });
    }
    return res.status(200).json({ image: `data:image/png;base64,${b64}` });
  } catch (e) {
    return res.status(500).json({ error: "เซิร์ฟเวอร์ผิดพลาด: " + (e.message || String(e)) });
  }
}
