import { NextRequest, NextResponse } from "next/server";
import { postToThreads, postCarouselToThreads, postVideoToThreads } from "@/lib/threads/client";
import { PublishRequest, PublishResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: PublishRequest = await req.json();
    const { postId, brandId, content, threadsUserId, threadsAccessToken, imageUrl, imageUrls, videoUrl, replyToId } = body as PublishRequest & { videoUrl?: string };

    if (!postId || !brandId || !content) {
      return NextResponse.json({ error: "postId, brandId, content は必須です" }, { status: 400 });
    }
    if (!threadsUserId || !threadsAccessToken) {
      return NextResponse.json({ error: "Threads API の設定が完了していません" }, { status: 400 });
    }

    let threadsPostId: string;

    if (videoUrl) {
      // 動画投稿（処理完了まで最大90秒ポーリング）
      threadsPostId = await postVideoToThreads(threadsUserId, threadsAccessToken, videoUrl, content);
    } else if (imageUrls && imageUrls.length >= 2) {
      // カルーセル投稿
      threadsPostId = await postCarouselToThreads(threadsUserId, threadsAccessToken, imageUrls, content);
    } else {
      // テキスト / 1枚画像 / 返信
      threadsPostId = await postToThreads(threadsUserId, threadsAccessToken, content, { imageUrl, replyToId });
    }

    return NextResponse.json({ threadsPostId } satisfies PublishResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Publish error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
