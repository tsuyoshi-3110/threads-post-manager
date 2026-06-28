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
import { ImageUploader } from "@/components/post/ImageUploader";
import { VideoUploader } from "@/components/post/VideoUploader";

type MediaType = "text" | "image" | "carousel" | "video";

function detectMediaType(post: Post): MediaType {
  if (post.videoUrl) return "video";
  if (post.imageUrls && post.imageUrls.length >= 2) return "carousel";
  if (post.imageUrl) return "image";
  return "text";
}

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
  const [editMediaType, setEditMediaType] = useState<MediaType>("text");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImageUrls, setEditImageUrls] = useState<string[]>(["", ""]);
  const [editVideoUrl, setEditVideoUrl] = useState("");
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
          imageUrl: post.imageUrl ?? undefined,
          imageUrls: post.imageUrls ?? undefined,
          videoUrl: post.videoUrl ?? undefined,
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
    const mediaType = detectMediaType(post);
    setEditContent(post.content);
    setEditMediaType(mediaType);
    setEditImageUrl(post.imageUrl ?? "");
    setEditImageUrls(post.imageUrls && post.imageUrls.length >= 2 ? [...post.imageUrls] : ["", ""]);
    setEditVideoUrl(post.videoUrl ?? "");
    setEditingPost(post);
  };

  const handleEditSave = async () => {
    if (!editingPost || !editContent.trim()) return;
    setEditSaving(true);
    try {
      await updatePost(editingPost.id, {
        content: editContent,
        imageUrl: editMediaType === "image" && editImageUrl ? editImageUrl : null,
        imageUrls: editMediaType === "carousel" ? editImageUrls.filter(Boolean) : null,
        videoUrl: editMediaType === "video" && editVideoUrl ? editVideoUrl : null,
      });
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

  const fieldClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

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
          <div className="w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" style={{ maxHeight: "90vh" }}>
            <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
              下書きを編集
            </h3>

            {/* メディアタイプ選択 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                投稿タイプ
              </label>
              <div className="flex gap-2">
                {(["text", "image", "video", "carousel"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setEditMediaType(type)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      editMediaType === type
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {type === "text" ? "テキスト" : type === "image" ? "画像" : type === "video" ? "動画" : "カルーセル"}
                  </button>
                ))}
              </div>
            </div>

            {/* メディアアップロード */}
            {editMediaType === "image" && (
              <div className="mb-4 space-y-3">
                <ImageUploader value={editImageUrl} onChange={setEditImageUrl} onRemove={() => setEditImageUrl("")} />
                <div>
                  <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">または公開 URL を直接入力</p>
                  <input
                    type="url"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="https://i.imgur.com/example.jpg"
                    className={fieldClass}
                  />
                </div>
              </div>
            )}

            {editMediaType === "carousel" && (
              <div className="mb-4 space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">2〜10枚の画像をアップロードしてください</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {editImageUrls.map((url, i) => (
                    <ImageUploader
                      key={i}
                      value={url}
                      onChange={(newUrl) => {
                        const next = [...editImageUrls];
                        next[i] = newUrl;
                        setEditImageUrls(next);
                      }}
                      label={`画像 ${i + 1}`}
                      onRemove={
                        editImageUrls.length > 2
                          ? () => setEditImageUrls(editImageUrls.filter((_, idx) => idx !== i))
                          : () => {
                              const next = [...editImageUrls];
                              next[i] = "";
                              setEditImageUrls(next);
                            }
                      }
                    />
                  ))}
                  {editImageUrls.length < 10 && (
                    <button
                      onClick={() => setEditImageUrls([...editImageUrls, ""])}
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-8 text-sm text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      <span className="text-2xl">+</span>
                      <span className="mt-1 text-xs">画像を追加</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {editMediaType === "video" && (
              <div className="mb-4">
                <VideoUploader value={editVideoUrl} onChange={setEditVideoUrl} onRemove={() => setEditVideoUrl("")} />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  ※ 動画は Threads での処理に最大90秒かかります
                </p>
              </div>
            )}

            {/* 投稿文 */}
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={7}
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
