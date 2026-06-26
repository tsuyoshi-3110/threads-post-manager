"use client";

import { useState } from "react";
import { usePosts } from "@/hooks/usePosts";
import { useBrands } from "@/hooks/useBrands";
import { deletePost } from "@/lib/firebase/firestore";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Post } from "@/types";

interface Reply {
  id: string;
  text?: string;
  timestamp: string;
  username?: string;
}

function PostItem({
  post,
  brandName,
  threadsUserId,
  accessToken,
  onDeleted,
}: {
  post: Post;
  brandName?: string;
  threadsUserId?: string;
  accessToken?: string;
  onDeleted: (id: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchReplies = async () => {
    if (!post.threadsPostId || !accessToken) return;
    setRepliesLoading(true);
    try {
      const params = new URLSearchParams({ threadsPostId: post.threadsPostId, accessToken });
      const res = await fetch(`/api/threads/replies?${params}`);
      const data = await res.json();
      setReplies(data.data ?? []);
    } finally {
      setRepliesLoading(false);
    }
  };

  const toggleReplies = () => {
    if (!showReplies && replies.length === 0) fetchReplies();
    setShowReplies((v) => !v);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !post.threadsPostId || !accessToken || !threadsUserId) return;
    setReplying(true);
    try {
      const res = await fetch("/api/threads/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadsUserId, accessToken, replyToId: post.threadsPostId, text: replyText }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "返信に失敗しました");
      }
      setReplyText("");
      await fetchReplies();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setReplying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("この投稿を削除しますか？")) return;
    setDeleting(true);
    try {
      let threadsDeleteFailed = false;
      if (post.threadsPostId && accessToken) {
        const res = await fetch("/api/threads/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadsPostId: post.threadsPostId, accessToken }),
        });
        const data = await res.json();
        if (!data.success) threadsDeleteFailed = true;
      }
      await deletePost(post.id);
      onDeleted(post.id);
      if (threadsDeleteFailed) {
        alert("アプリから削除しました。\nThreads 側の削除に失敗したため、Threads アプリから手動で削除してください。");
      }
    } finally {
      setDeleting(false);
    }
  };

  const createdAt = post.createdAt?.toDate();
  const publishedAt = post.publishedAt?.toDate();

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={post.status} />
            {brandName && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {brandName}
              </span>
            )}
            {post.aiGenerated && (
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                AI生成
              </span>
            )}
          </div>
          {createdAt && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {format(createdAt, "yyyy/MM/dd HH:mm", { locale: ja })}
            </span>
          )}
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          {post.content}
        </p>

        {/* 画像サムネイル */}
        {post.imageUrl && (
          <div className="mt-3">
            <img
              src={post.imageUrl}
              alt="投稿画像"
              className="h-32 w-auto rounded-lg object-cover"
            />
          </div>
        )}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.imageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`画像 ${i + 1}`}
                className="h-24 w-24 rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        {publishedAt && post.status === "published" && (
          <p className="mt-2 text-xs text-green-600 dark:text-green-400">
            ✅ {format(publishedAt, "yyyy/MM/dd HH:mm", { locale: ja })} に投稿済み
          </p>
        )}

        <div className="mt-4 flex gap-2">
          {post.threadsPostId && (
            <Button size="sm" variant="secondary" onClick={toggleReplies}>
              💬 返信 {showReplies ? "▲" : "▼"}
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={handleDelete} loading={deleting}>
            削除
          </Button>
        </div>
      </div>

      {/* 返信パネル */}
      {showReplies && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          {repliesLoading && <LoadingSpinner className="py-4" />}
          {!repliesLoading && replies.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">返信はありません</p>
          )}
          <div className="space-y-3">
            {replies.map((reply) => (
              <div key={reply.id} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                {reply.username && (
                  <p className="mb-1 text-xs font-medium text-blue-600 dark:text-blue-400">@{reply.username}</p>
                )}
                <p className="text-sm text-gray-800 dark:text-gray-200">{reply.text}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {new Date(reply.timestamp).toLocaleString("ja-JP")}
                </p>
              </div>
            ))}
          </div>

          {/* 返信入力 */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="返信を入力..."
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <Button size="sm" onClick={handleReply} loading={replying} disabled={!replyText.trim()}>
              返信
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { posts, loading, refetch } = usePosts("published");
  const { brands } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string>("all");

  const handleDeleted = (id: string) => refetch();

  if (loading) return <LoadingSpinner className="py-20" />;

  const filtered =
    selectedBrandId === "all" ? posts : posts.filter((p) => p.brandId === selectedBrandId);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">投稿履歴</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{filtered.length} 件の投稿</p>
      </div>

      {brands.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedBrandId("all")}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              selectedBrandId === "all"
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            }`}
          >
            すべて
          </button>
          {brands.map((brand) => {
            const count = posts.filter((p) => p.brandId === brand.id).length;
            return (
              <button
                key={brand.id}
                onClick={() => setSelectedBrandId(brand.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedBrandId === brand.id
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                }`}
              >
                {brand.name}
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-300">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-gray-400 dark:text-gray-500">まだ投稿がありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => {
            const brand = brands.find((b) => b.id === post.brandId);
            return (
              <PostItem
                key={post.id}
                post={post}
                brandName={brand?.name}
                threadsUserId={brand?.threadsUserId}
                accessToken={brand?.threadsAccessToken}
                onDeleted={handleDeleted}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
