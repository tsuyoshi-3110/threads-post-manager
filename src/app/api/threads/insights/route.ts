import { NextRequest, NextResponse } from "next/server";

const THREADS_API_BASE = "https://graph.threads.net/v1.0";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const threadsUserId = searchParams.get("threadsUserId");
  const accessToken = searchParams.get("accessToken");
  const type = searchParams.get("type"); // "user" | "post"
  const postId = searchParams.get("postId");

  if (!threadsUserId || !accessToken) {
    return NextResponse.json({ error: "threadsUserId と accessToken は必須です" }, { status: 400 });
  }

  try {
    if (type === "post" && postId) {
      // 投稿ごとのインサイト
      const params = new URLSearchParams({
        metric: "views,likes,replies,reposts,quotes",
        access_token: accessToken,
      });
      const res = await fetch(`${THREADS_API_BASE}/${postId}/insights?${params}`);
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "取得失敗" }, { status: res.status });
      return NextResponse.json(data);
    }

    // ユーザー全体のインサイト
    const params = new URLSearchParams({
      metric: "views,followers_count,likes,replies,reposts,quotes",
      period: "lifetime",
      access_token: accessToken,
    });
    const res = await fetch(`${THREADS_API_BASE}/${threadsUserId}/threads_insights?${params}`);
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "取得失敗" }, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
