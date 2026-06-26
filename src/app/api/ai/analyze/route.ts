import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
const getClient = () => {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
};

interface PostData {
  text: string;
  timestamp: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}

export async function POST(req: NextRequest) {
  try {
    const { posts, brandName, totalViews }: { posts: PostData[]; brandName: string; totalViews: number } = await req.json();

    if (!posts?.length) {
      return NextResponse.json({ error: "投稿データが必要です" }, { status: 400 });
    }

    const postSummary = posts
      .map((p, i) => {
        const date = new Date(p.timestamp);
        const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
        const day = weekdays[date.getDay()];
        const hour = date.getHours();
        const engagement = p.views + p.likes * 3 + p.replies * 2 + p.reposts * 2 + p.quotes * 2;
        return `[投稿${i + 1}] ${date.getMonth() + 1}/${date.getDate()}(${day}) ${hour}時投稿 | 表示:${p.views} いいね:${p.likes} 返信:${p.replies} リポスト:${p.reposts} | エンゲージメントスコア:${engagement} | 内容:「${p.text.slice(0, 80)}${p.text.length > 80 ? "…" : ""}」`;
      })
      .join("\n");

    const prompt = `あなたは SNS マーケティングの専門家です。以下の Threads 投稿データを分析して、次の投稿への具体的なアドバイスをください。

【ブランド】${brandName}
【アカウント総表示回数】${totalViews.toLocaleString()}
【投稿データ】
${postSummary}

以下の観点で分析してください：
1. **最適な投稿時間帯** - データから読み取れるパターン
2. **効果的なコンテンツの特徴** - 反応が良かった投稿の共通点
3. **次の投稿への具体的な提案** - いつ・どんな内容を投稿すべきか
4. **改善ポイント** - エンゲージメントを上げるためのヒント

データが少ない場合でも、あるデータから読み取れる傾向を元に、積極的にアドバイスしてください。
出力は日本語で、マークダウン形式で読みやすくまとめてください。`;

    const response = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    });

    const analysis = response.choices[0].message.content ?? "";
    return NextResponse.json({ analysis });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
