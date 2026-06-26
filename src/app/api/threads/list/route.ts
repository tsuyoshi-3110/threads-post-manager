import { NextRequest, NextResponse } from "next/server";

const THREADS_API_BASE = "https://graph.threads.net/v1.0";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const threadsUserId = searchParams.get("threadsUserId");
  const accessToken = searchParams.get("accessToken");

  if (!threadsUserId || !accessToken) {
    return NextResponse.json({ error: "threadsUserId と accessToken は必須です" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      fields: "id,text,timestamp,media_type,shortcode,permalink",
      access_token: accessToken,
      limit: "25",
    });

    const res = await fetch(`${THREADS_API_BASE}/${threadsUserId}/threads?${params}`);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message ?? "取得に失敗しました" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
