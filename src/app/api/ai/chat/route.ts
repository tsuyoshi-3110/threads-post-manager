import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
const getClient = () => {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
};

export async function POST(req: NextRequest) {
  try {
    const { messages, brandName, brandDescription } = await req.json();

    if (!messages?.length) {
      return NextResponse.json({ error: "messages は必須です" }, { status: 400 });
    }

    const brandContext = brandDescription || brandName || "";

    const systemPrompt = `あなたは優秀なSNSコピーライター兼クリエイティブパートナーです。ユーザーと対話しながらThreadsの投稿文を一緒に作ります。

${brandContext ? `【ブランド情報】\n${brandContext}\n` : ""}
【返答フォーマット】
投稿文は必ず [POST]〜[/POST] タグで囲んで出力すること。

- 投稿作成・修正依頼 → 投稿についての一言コメント（良い点・工夫した点など2〜3文）を述べた後、改行して [POST]投稿文[/POST] を出力
- 「どう思う？」「どうですかね？」など感想を求める場合 → 感想を2〜3文で述べた後、改行して [POST]投稿文[/POST] を出力
- 雑談・相談 → 普通に返答。投稿が必要なら末尾に [POST]投稿文[/POST] を添える
- 確定・保存など投稿不要の返答 → [POST]タグ不要、「✅ 確定しました！」など一言だけ返す

【投稿のルール】
- 200文字以内
- ハッシュタグ2〜3個`;



    // imageUrl が含まれるメッセージを vision 形式に変換
    const formattedMessages = messages.map((m: { role: string; content: string; imageUrl?: string }) => {
      if (m.imageUrl) {
        return {
          role: m.role,
          content: [
            { type: "text", text: m.content || "この画像を見て、Threads の投稿文を作ってください。" },
            { type: "image_url", image_url: { url: m.imageUrl } },
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    const response = await getClient().chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedMessages,
      ],
      max_completion_tokens: 8000,
    });

    const content = response.choices[0].message.content ?? "";
    return NextResponse.json({ content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
