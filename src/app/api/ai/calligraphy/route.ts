import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

let _openai: OpenAI | null = null;
const getClient = () => {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
};

const STYLE_PROMPTS: Record<string, string> = {
  motivational: "aged parchment scroll with warm brown and cream tones, subtle washi paper texture",
  traditional:  "clean white washi paper with minimal decoration, elegant ink wash (sumi-e) style",
  modern:       "white background with dramatic ink splatter effects, bold contemporary composition",
};

async function urlToFile(url: string, index: number): Promise<File> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/png";
  return toFile(Buffer.from(buffer), `character_${index}.png`, { type: contentType });
}

export async function POST(req: NextRequest) {
  try {
    const { text, style = "motivational", characterDescription, characterImageUrls } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "テキストを入力してください" }, { status: 400 });
    }

    const styleDesc = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.motivational;
    const client = getClient();
    let imageData: string | null = null;

    // 登録済み画像がある場合は images.edit() で参照画像として渡す
    if (characterImageUrls && characterImageUrls.length > 0) {
      const prompt = `Japanese calligraphy artwork. The exact text "${text}" written in traditional Japanese brush calligraphy (shodō 書道) style as the main focal element with large expressive brushstrokes. Background: ${styleDesc}. The character from the reference image(s) appears naturally in the lower right corner, maintaining their appearance and art style from the reference. The Japanese characters must be accurate and legible. Square format, social media poster.`;

      // 最大3枚の参照画像を取得
      const imageFiles = await Promise.all(
        (characterImageUrls as string[]).slice(0, 3).map((url, i) => urlToFile(url, i))
      );

      const response = await client.images.edit({
        model: "gpt-image-1",
        image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
        prompt,
        n: 1,
        size: "1024x1024",
      });

      const item = response.data?.[0];
      imageData = item?.b64_json
        ? `data:image/png;base64,${item.b64_json}`
        : item?.url ?? null;

    } else {
      // 画像なし：説明テキストだけでキャラクターをプロンプトに含める
      const characterPart = characterDescription
        ? ` A small anime-style character illustration (${characterDescription}) appears in the lower right corner as a decorative element.`
        : "";

      const prompt = `Japanese calligraphy artwork. The exact Japanese text "${text}" written prominently in traditional Japanese brush calligraphy (shodō 書道) style with thick expressive brushstrokes. Background: ${styleDesc}.${characterPart} The Japanese characters must be accurate and legible. Square 1:1 format, social media ready.`;

      const response = await client.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
      });

      const item = response.data?.[0];
      imageData = item?.b64_json
        ? `data:image/png;base64,${item.b64_json}`
        : item?.url ?? null;
    }

    if (!imageData) throw new Error("画像の生成に失敗しました");
    return NextResponse.json({ imageData });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Calligraphy error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
