import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
const getClient = () => {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
};

const CHAR_STYLES: Record<string, string> = {
  anime:  "Japanese anime art style, detailed illustration, clean line art, vibrant colors",
  chibi:  "cute chibi anime style, big head small body, adorable and friendly, simple but expressive",
  yuru:   "yuru-chara style, loose cute mascot character, simple rounded shapes, very friendly and approachable",
};

export async function POST(req: NextRequest) {
  try {
    const { characterDescription, charStyle = "anime" } = await req.json();

    if (!characterDescription?.trim()) {
      return NextResponse.json({ error: "キャラクターの説明を入力してください" }, { status: 400 });
    }

    const styleDesc = CHAR_STYLES[charStyle] ?? CHAR_STYLES.anime;

    const prompt = `Character illustration: ${characterDescription}. Art style: ${styleDesc}. The character is a standalone mascot figure facing forward or at a slight 3/4 angle. White background. Full body or bust portrait. Clean, professional illustration suitable for use as a brand mascot on social media. No text, no speech bubbles.`;

    const response = await getClient().images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    });

    const item = response.data?.[0];
    const imageData = item?.b64_json
      ? `data:image/png;base64,${item.b64_json}`
      : item?.url ?? null;

    if (!imageData) throw new Error("画像の生成に失敗しました");

    return NextResponse.json({ imageData });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Character error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
