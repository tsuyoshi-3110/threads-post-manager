import { NextRequest, NextResponse } from "next/server";
import { postToThreads } from "@/lib/threads/client";

export async function POST(req: NextRequest) {
  try {
    const { threadsUserId, accessToken, replyToId, text } = await req.json();
    if (!threadsUserId || !accessToken || !replyToId || !text) {
      return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
    }
    const threadsPostId = await postToThreads(threadsUserId, accessToken, text, { replyToId });
    return NextResponse.json({ threadsPostId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
