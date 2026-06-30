import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
const getClient = () => {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
};

const PURPOSE_GUIDE: Record<string, string> = {
  daily:
    "日常投稿。フォロワーが共感・反応しやすい、ユニークな視点や哲学・日常の気づきを伝える投稿。",
  soft:
    "ソフト誘導。製品を直接宣伝せず、製品の世界観・価値観・問題提起を伝えて自然に興味を引く投稿。",
  promotion:
    "商品紹介。製品の魅力・メリット・価格・URLを盛り込み、購買意欲を高める投稿。",
};

export async function POST(req: NextRequest) {
  try {
    const { brand, product, purpose, ideaTitle, ideaDescription } = await req.json();

    const productInfo = product
      ? `\n【製品情報】\n製品名: ${product.name}\nキャッチコピー: ${product.tagline}\n説明: ${product.description}\n価格: ${product.price}\nターゲット: ${product.targetAudience}\n特徴: ${product.features?.filter(Boolean).join(" / ")}\nURL: ${product.url}`
      : "";

    const prompt = `あなたは優秀なSNSコピーライターです。
以下のアイデアをもとに、Threads投稿文を1つ作成してください。

【ブランド】${brand.name}（${brand.description || ""}）${productInfo}

【投稿目的】${PURPOSE_GUIDE[purpose] ?? ""}

【アイデア】
タイトル: ${ideaTitle}
概要: ${ideaDescription}

【ルール】
- 200文字以内
- ハッシュタグ2〜3個
- 投稿文のみ出力（説明・タグなど不要）`;

    const response = await getClient().chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 4000,
    });

    const content = response.choices[0].message.content?.trim() ?? "";
    return NextResponse.json({ content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Generate-from-idea error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
