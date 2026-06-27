"use client";

import { useState } from "react";
import { usePosts } from "@/hooks/usePosts";
import { useBrands } from "@/hooks/useBrands";
import { PostCard } from "@/components/post/PostCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Post } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { updatePost } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export default function DraftsPage() {
  const { posts, loading, remove, refetch } = usePosts("draft");
  const { brands } = useBrands();
  const { user } = useAuth();
  const [publishing, setPublishing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [schedulingPost, setSchedulingPost] = useState<Post | null>(null);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const handlePublish = async (post: Post) => {
    const brand = brands.find((b) => b.id === post.brandId);
    if (!brand) { setError("ブランド情報が見つかりません"); return; }
    setPublishing(post.id);
    setError("");
    try {
      const res = await fetch("/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          brandId: post.brandId,
          content: post.content,
          threadsUserId: brand.threadsUserId,
          threadsAccessToken: brand.threadsAccessToken,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "投稿に失敗しました");
      }
      const { threadsPostId } = await res.json();
      await updatePost(post.id, {
        status: "published",
        publishedAt: Timestamp.now(),
        threadsPostId,
      });
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(null);
    }
  };

  const openEditModal = (post: Post) => {
    setEditContent(post.content);
    setEditingPost(post);
  };

  const handleEditSave = async () => {
    if (!editingPost || !editContent.trim()) return;
    setEditSaving(true);
    try {
      await updatePost(editingPost.id, { content: editContent });
      await refetch();
      setEditingPost(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEditSaving(false);
    }
  };

  const openScheduleModal = (post: Post) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    now.setSeconds(0);
    setScheduledDateTime(format(now, "yyyy-MM-dd'T'HH:mm"));
    setSchedulingPost(post);
  };

  const handleScheduleConfirm = async () => {
    if (!schedulingPost || !scheduledDateTime) return;
    setScheduling(true);
    try {
      const date = new Date(scheduledDateTime);
      await updatePost(schedulingPost.id, {
        status: "scheduled",
        scheduledAt: Timestamp.fromDate(date),
      });
      await refetch();
      setSchedulingPost(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScheduling(false);
    }
  };

  if (loading) return <LoadingSpinner className="py-20" />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">下書き一覧</h2>
        <Link href="/create">
          <Button size="sm">✏️ 新規作成</Button>
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </p>
      )}

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-gray-400 dark:text-gray-500">下書きはありません</p>
          <Link href="/create" className="mt-3 inline-block">
            <Button variant="secondary" size="sm">
              最初の投稿を作成
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const brand = brands.find((b) => b.id === post.brandId);
            return (
              <div key={post.id} className={publishing === post.id ? "opacity-50 pointer-events-none" : ""}>
                <PostCard
                  post={post}
                  brandName={brand?.name}
                  onDelete={remove}
                  onPublish={handlePublish}
                  onSchedule={openScheduleModal}
                  onEdit={openEditModal}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 編集モーダル */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
              下書きを編集
            </h3>

            {/* メディアプレビュー（読み取り専用） */}
            {editingPost.imageUrl && (
              <div className="mb-3">
                <img src={editingPost.imageUrl} alt="添付画像" className="max-h-40 rounded-lg object-cover" />
              </div>
            )}
            {editingPost.imageUrls && editingPost.imageUrls.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto">
                {editingPost.imageUrls.map((url, i) => (
                  <img key={i} src={url} alt={`画像${i + 1}`} className="h-24 w-24 flex-shrink-0 rounded-lg object-cover" />
                ))}
              </div>
            )}
            {editingPost.videoUrl && (
              <div className="mb-3">
                <video src={editingPost.videoUrl} controls className="max-h-40 w-full rounded-lg" />
              </div>
            )}

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">
              {editContent.length} 文字
            </p>

            <div className="mt-4 flex gap-3">
              <Button onClick={handleEditSave} loading={editSaving} className="flex-1">
                保存
              </Button>
              <Button variant="secondary" onClick={() => setEditingPost(null)} className="flex-1">
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 予約日時設定モーダル */}
      {schedulingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
              予約投稿を設定
            </h3>
            <p className="mb-4 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
              {schedulingPost.content}
            </p>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              投稿日時
            </label>
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />

            <div className="mt-5 flex gap-3">
              <Button onClick={handleScheduleConfirm} loading={scheduling} className="flex-1">
                予約を設定
              </Button>
              <Button variant="secondary" onClick={() => setSchedulingPost(null)} className="flex-1">
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
