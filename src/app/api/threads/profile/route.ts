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
      fields: "id,username,name,threads_profile_picture_url,threads_biography,followers_count",
      access_token: accessToken,
    });
    const res = await fetch(`${THREADS_API_BASE}/${threadsUserId}?${params}`);
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "取得失敗" }, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
