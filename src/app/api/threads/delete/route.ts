import { NextRequest, NextResponse } from "next/server";
import { deleteThreadsPost } from "@/lib/threads/client";

export async function POST(req: NextRequest) {
  const { threadsPostId, accessToken } = await req.json();
  if (!threadsPostId || !accessToken) {
    return NextResponse.json({ error: "threadsPostId と accessToken は必須です" }, { status: 400 });
  }
  try {
    await deleteThreadsPost(threadsPostId, accessToken);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Threads 側の削除失敗はクライアントに伝えるが 200 で返す（Firestore 削除は続行させる）
    return NextResponse.json({ success: false, threadsError: msg });
  }
}
