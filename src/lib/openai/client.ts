import OpenAI from "openai";

let _openai: OpenAI | null = null;

const getClient = () => {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
};

const BRAND_CONTEXTS: Record<string, string> = {
  Xenovant:
    "Xenovant（ゼノバント）は建設業界のDX・業務効率化に特化したクラウドサービスを開発するテクノロジー企業です。施工管理・工程管理・写真管理・材料積算など現場の課題をテクノロジーで解決します。ブランドメッセージは「建設業の未来を、現場から変える。」。現場経験に基づいた実務目線で、力強くかつ現場に寄り添うトーンで発信します。",
  ProcNova:
    "ProcNovaはプロセス改善・業務効率化に特化したブランドです。実用的で明快なトーンで発信します。",
  Pageit:
    "PageitはWebサイト・LP制作に特化したブランドです。クリエイティブで親しみやすいトーンで発信します。",
  "孤高の暇人":
    "Xenovantに所属する一個人の個人ブランド。建設業・仕事・人生・テクノロジーについて、独り言のようにつぶやく。哲学的なようで実はゆるい。深いようで浅い。共感を呼ぶ皮肉やユーモアを交えながら、孤独だけど自由な視点で語る。口調は断定的でシンプル。余計な説明はしない。余白を大切にする。",
};

export const generateThreadsPost = async (
  prompt: string,
  brandName: string,
  tone: string = "casual",
  brandDescription?: string
): Promise<string> => {
  const brandContext = brandDescription || BRAND_CONTEXTS[brandName] || "";

  const systemPrompt = `あなたはSNSマーケターです。Threadsの投稿文を作成してください。
${brandContext ? `【ブランド情報】\n${brandContext}` : ""}
- 必ず200文字以内に収める（厳守）
- 改行を適切に使い読みやすくする
- ハッシュタグは2〜3個
- トーン: ${tone === "professional" ? "プロフェッショナル" : tone === "friendly" ? "親しみやすい" : "カジュアル"}
`;

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0].message.content ?? "";
};
