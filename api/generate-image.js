// Vercel Serverless Function — ซ่อน OpenAI API key ไว้ฝั่งเซิร์ฟเวอร์
// ผู้ใช้ปลายทางมองไม่เห็น key (key อยู่ใน Environment Variable: OPENAI_API_KEY)
//
// ขั้นตอน:
// 1) (ถ้า refine=true) ส่ง prompt ให้ GPT ช่วยเกลาเป็นคำสั่งภาพคุณภาพสูง + ย้ำห้ามมีตัวอักษร
// 2) เรียกโมเดลภาพ gpt-image-1 วาดภาพ
const NO_TEXT_RULE =
  "ABSOLUTELY NO text, no letters, no Thai characters, no numbers, no labels, " +
  "no captions, no watermark, no dimension annotations, no title block, no signage. Pure visual only.";

async function refinePrompt(apiKey, rawPrompt) {
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert prompt engineer for architectural image generation. " +
              "Rewrite the user's brief into ONE vivid, concise English image prompt (max 120 words) " +
              "optimized for a text-to-image model. Focus on materials, lighting, composition, realism. " +
              "The image MUST contain no text of any kind. End the prompt with this exact rule: " + NO_TEXT_RULE
          },
          { role: "user", content: rawPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });
    const data = await r.json();
    const out = data && data.choices && data.choices[0] && data.choices[0].message
      && data.choices[0].message.content ? data.choices[0].message.content.trim() : "";
    if (out && out.length > 20) {
      return out.includes("NO text") ? out : (out + " " + NO_TEXT_RULE);
    }
  } catch (e) { /* ถ้าเกลาไม่สำเร็จ ใช้ prompt เดิม */ }
  return rawPrompt + " " + NO_TEXT_RULE;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า OPENAI_API_KEY บนเซิร์ฟเวอร์" });
  }
  try {
    const { prompt, size = "1024x1024", quality = "high", refine = false } = req.body || {};
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return res.status(400).json({ error: "ไม่มีคำสั่ง (prompt) หรือสั้นเกินไป" });
    }
    let finalPrompt = prompt.slice(0, 4000);

    // ขั้นที่ 1: เกลา prompt ด้วย GPT (เลียนแบบที่เว็บ ChatGPT ทำ)
    if (refine) {
      finalPrompt = await refinePrompt(apiKey, finalPrompt);
    } else {
      finalPrompt = finalPrompt + " " + NO_TEXT_RULE;
    }

    // ขั้นที่ 2: สร้างภาพ
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: finalPrompt.slice(0, 4000),
        size: size,
        quality: quality,
        n: 1
      })
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : "เรียก OpenAI ไม่สำเร็จ";
      return res.status(r.status).json({ error: msg });
    }
    const b64 = data && data.data && data.data[0] ? data.data[0].b64_json : null;
    if (!b64) {
      return res.status(502).json({ error: "ไม่ได้รับภาพกลับจาก OpenAI" });
    }
    return res.status(200).json({ image: `data:image/png;base64,${b64}`, usedPrompt: finalPrompt });
  } catch (e) {
    return res.status(500).json({ error: "เซิร์ฟเวอร์ผิดพลาด: " + (e.message || String(e)) });
  }
}
