import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
const getClient = () => {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
};

function extractContent(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) {
    return (raw as { type: string; text?: string }[])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
  }
  return "";
}

async function generate(prompt: string): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 2000,
  });
  return extractContent(res.choices[0]?.message?.content);
}

export async function POST(req: NextRequest) {
  try {
    const { brand, theme } = await req.json();

    const brandPart = brand?.name ? `投稿者「${brand.name}」向け。` : "";
    const themePart = theme ? `テーマ「${theme}」。` : "";

    // 1回目
    const prompt1 = `${brandPart}${themePart}日本の書道アート向けの短い名言を1つ出力してください。10〜25文字。言葉だけ出力。`;
    let message = await generate(prompt1);

    // 空だった場合はシンプルなプロンプトでリトライ
    if (!message) {
      const prompt2 = theme
        ? `「${theme}」をテーマにした書道向けの短い名言を1つ、10〜25文字で出力してください。`
        : `書道向けの力強い名言を1つ、10〜25文字で出力してください。`;
      message = await generate(prompt2);
    }

    // それでも空ならテーマなしで再試行
    if (!message) {
      message = await generate("人の心に響く短い名言を1つ、10〜20文字で出力してください。");
    }

    return NextResponse.json({ message });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Message error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
