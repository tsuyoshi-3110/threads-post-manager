import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
const getClient = () => {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
};

const BALANCE = {
  daily_heavy: { daily: 0.8, soft: 0.15, promotion: 0.05 },
  balanced:    { daily: 0.7, soft: 0.2,  promotion: 0.1  },
  promo_heavy: { daily: 0.5, soft: 0.3,  promotion: 0.2  },
};

const PERIOD_DAYS: Record<string, number> = {
  "1week": 7,
  "2weeks": 14,
  "1month": 30,
};

export async function POST(req: NextRequest) {
  try {
    const { brand, product, period, postsPerDay, balanceMode } = await req.json();

    const days = PERIOD_DAYS[period] ?? 7;
    const total = days * (postsPerDay ?? 1);
    const ratio = BALANCE[balanceMode as keyof typeof BALANCE] ?? BALANCE.balanced;

    const dailyCount = Math.round(total * ratio.daily);
    const softCount  = Math.round(total * ratio.soft);
    const promoCount = total - dailyCount - softCount;

    // 翌日からの日付リストを生成
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(0, 0, 0, 0);

    const times = postsPerDay === 2 ? ["12:00", "20:00"] : ["20:00"];

    const dateSlots: { date: string; time: string }[] = [];
    for (let d = 0; d < days; d++) {
      const dt = new Date(startDate);
      dt.setDate(startDate.getDate() + d);
      const dateStr = dt.toISOString().split("T")[0];
      times.forEach((t) => dateSlots.push({ date: dateStr, time: t }));
    }

    const productInfo = product
      ? `製品名: ${product.name}\nキャッチコピー: ${product.tagline}\n特徴: ${product.features?.filter(Boolean).join(" / ")}`
      : "なし";

    const prompt = `あなたはSNSコンテンツプランナーです。
ブランド「${brand.name}」（${brand.description || ""}）のThreads投稿計画を作成してください。

【紹介製品】
${productInfo}

【投稿内訳】
- 日常投稿（フォロワーを惹きつける日常・哲学・共感系）: ${dailyCount}件
- ソフト誘導（製品の世界観・価値観・問題提起で自然に興味を引く）: ${softCount}件
- 商品紹介（製品の魅力・メリットを直接アピール）: ${promoCount}件

合計 ${total} 件のアイデアを以下のJSON配列で出力してください（他のテキストは不要）。
purposeの割り当ては内訳通りにすること。

[
  {
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "purpose": "daily" | "soft" | "promotion",
    "ideaTitle": "アイデアタイトル（15文字以内）",
    "ideaDescription": "投稿の概要・ポイント（40文字以内）"
  }
]

日付・時刻は以下のスロットを順番に使用してください:
${dateSlots.map((s) => `${s.date} ${s.time}`).join(", ")}`;

    const response = await getClient().chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 16000,
    });

    const raw = response.choices[0].message.content ?? "";

    // JSON部分を抽出してパース
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "プランの生成に失敗しました" }, { status: 500 });
    }

    const plan = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ plan });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Planner error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
