import { NextRequest, NextResponse } from "next/server";

const THREADS_API_BASE = "https://graph.threads.net/v1.0";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const threadsPostId = searchParams.get("threadsPostId");
  const accessToken = searchParams.get("accessToken");

  if (!threadsPostId || !accessToken) {
    return NextResponse.json({ error: "threadsPostId と accessToken は必須です" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      fields: "id,text,timestamp,username",
      access_token: accessToken,
    });
    const res = await fetch(`${THREADS_API_BASE}/${threadsPostId}/replies?${params}`);
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "取得失敗" }, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
