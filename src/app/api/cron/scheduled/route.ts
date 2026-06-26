import { NextRequest, NextResponse } from "next/server";
import { getReadyScheduledPosts, getBrand, updatePost } from "@/lib/firebase/firestore";
import { postToThreads, postCarouselToThreads, postVideoToThreads } from "@/lib/threads/client";
import { Timestamp } from "firebase/firestore";

// Vercel Cron から毎分呼ばれる（vercel.json で設定）
// 開発時は Authorization ヘッダーなしでも動作する

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const posts = await getReadyScheduledPosts();

    if (posts.length === 0) {
      return NextResponse.json({ processed: 0, succeeded: 0, failed: 0 });
    }

    let succeeded = 0;
    let failed = 0;

    for (const post of posts) {
      try {
        const brand = await getBrand(post.brandId);
        if (!brand?.threadsUserId || !brand?.threadsAccessToken) {
          throw new Error("Threads 認証情報が見つかりません");
        }

        let threadsPostId: string;
        if (post.videoUrl) {
          threadsPostId = await postVideoToThreads(
            brand.threadsUserId, brand.threadsAccessToken,
            post.videoUrl, post.content
          );
        } else if (post.imageUrls && post.imageUrls.length >= 2) {
          threadsPostId = await postCarouselToThreads(
            brand.threadsUserId, brand.threadsAccessToken,
            post.imageUrls, post.content
          );
        } else {
          threadsPostId = await postToThreads(
            brand.threadsUserId, brand.threadsAccessToken, post.content,
            { imageUrl: post.imageUrl ?? undefined }
          );
        }

        await updatePost(post.id, {
          status: "published",
          publishedAt: Timestamp.now(),
          threadsPostId,
        });
        succeeded++;
      } catch (e) {
        console.error(`Scheduled post ${post.id} failed:`, e);
        await updatePost(post.id, { status: "failed" } as Parameters<typeof updatePost>[1]);
        failed++;
      }
    }

    return NextResponse.json({ processed: posts.length, succeeded, failed });
  } catch (e) {
    console.error("Cron error:", e);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }
}
