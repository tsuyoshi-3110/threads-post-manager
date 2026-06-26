import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/threads?error=${error}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/threads?error=no_code", req.url)
    );
  }

  // code を短期トークンと交換
  const appId = process.env.NEXT_PUBLIC_THREADS_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/threads/callback`;

  const res = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId!,
      client_secret: appSecret!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.redirect(
      new URL(`/auth/threads?error=${encodeURIComponent(JSON.stringify(data))}`, req.url)
    );
  }

  const shortToken = data.access_token;
  const userId = data.user_id;

  // 長期トークンに交換
  const longRes = await fetch(
    `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`
  );
  const longData = await longRes.json();
  const longToken = longData.access_token ?? shortToken;

  return NextResponse.redirect(
    new URL(
      `/auth/threads?token=${encodeURIComponent(longToken)}&userId=${userId}`,
      req.url
    )
  );
}
