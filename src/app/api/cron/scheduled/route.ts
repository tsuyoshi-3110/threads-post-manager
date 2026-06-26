import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { postToThreads, postCarouselToThreads, postVideoToThreads } from "@/lib/threads/client";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { Post, Brand } from "@/types";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = adminDb();
    const now = Timestamp.now();

    // Admin SDK で直接クエリ（セキュリティルール不要）
    const snap = await db.collection("posts")
      .where("status", "==", "scheduled")
      .get();

    const posts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Post & { scheduledAt: Timestamp }))
      .filter((p) => p.scheduledAt && p.scheduledAt.toMillis() <= now.toMillis());

    console.log(`[Cron] 配信待ち投稿数: ${posts.length}`);

    if (posts.length === 0) {
      return NextResponse.json({ processed: 0, succeeded: 0, failed: 0, message: "配信待ち投稿なし" });
    }

    let succeeded = 0;
    let failed = 0;

    for (const post of posts) {
      try {
        const brandSnap = await db.collection("brands").doc(post.brandId).get();
        const brand = brandSnap.data() as Brand | undefined;

        if (!brand?.threadsUserId || !brand?.threadsAccessToken) {
          throw new Error("Threads 認証情報が見つかりません");
        }

        let threadsPostId: string;
        if (post.videoUrl) {
          threadsPostId = await postVideoToThreads(
            brand.threadsUserId, brand.threadsAccessToken, post.videoUrl, post.content
          );
        } else if (post.imageUrls && post.imageUrls.length >= 2) {
          threadsPostId = await postCarouselToThreads(
            brand.threadsUserId, brand.threadsAccessToken, post.imageUrls, post.content
          );
        } else {
          threadsPostId = await postToThreads(
            brand.threadsUserId, brand.threadsAccessToken, post.content,
            { imageUrl: post.imageUrl ?? undefined }
          );
        }

        await db.collection("posts").doc(post.id).update({
          status: "published",
          publishedAt: FieldValue.serverTimestamp(),
          threadsPostId,
          updatedAt: FieldValue.serverTimestamp(),
        });
        succeeded++;
      } catch (e) {
        console.error(`[Cron] post ${post.id} failed:`, e);
        await db.collection("posts").doc(post.id).update({
          status: "failed",
          updatedAt: FieldValue.serverTimestamp(),
        });
        failed++;
      }
    }

    return NextResponse.json({ processed: posts.length, succeeded, failed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Cron] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
