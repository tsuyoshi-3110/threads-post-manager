"use client";

import { useState } from "react";
import { usePosts } from "@/hooks/usePosts";
import { useBrands } from "@/hooks/useBrands";
import { updatePost } from "@/lib/firebase/firestore";
import { PostCard } from "@/components/post/PostCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Timestamp } from "firebase/firestore";
import { Post } from "@/types";

const toLocalDateTimeString = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function ScheduledPage() {
  const { posts, loading, remove, refetch } = usePosts("scheduled");
  const { brands } = useBrands();
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDateTime, setEditDateTime] = useState("");
  const [saving, setSaving] = useState(false);

  const runNow = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/cron/scheduled");
      const data = await res.json();
      if (data.processed === 0) {
        setRunResult("配信時間を過ぎた予約投稿はありませんでした");
      } else {
        setRunResult(`${data.succeeded} 件投稿完了${data.failed > 0 ? `、${data.failed} 件失敗` : ""}`);
      }
    } catch {
      setRunResult("実行に失敗しました");
    } finally {
      setRunning(false);
    }
  };

  const openEdit = (post: Post) => {
    setEditPost(post);
    setEditContent(post.content);
    setEditDateTime(
      post.scheduledAt
        ? toLocalDateTimeString(post.scheduledAt.toDate())
        : toLocalDateTimeString(new Date(Date.now() + 30 * 60 * 1000))
    );
  };

  const saveEdit = async () => {
    if (!editPost || !editContent.trim() || !editDateTime) return;
    setSaving(true);
    try {
      await updatePost(editPost.id, {
        content: editContent,
        scheduledAt: Timestamp.fromDate(new Date(editDateTime)),
      });
      setEditPost(null);
      await refetch();
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner className="py-20" />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            予約投稿一覧
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            設定した日時に自動投稿されます
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runNow}
            disabled={running}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            {running ? "確認中..." : "今すぐ確認"}
          </button>
          <Link href="/create">
            <Button size="sm">✏️ 新規作成</Button>
          </Link>
        </div>
      </div>

      {runResult && (
        <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {runResult}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-gray-400 dark:text-gray-500">予約投稿はありません</p>
          <Link href="/create" className="mt-3 inline-block">
            <Button variant="secondary" size="sm">
              予約投稿を作成
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const brand = brands.find((b) => b.id === post.brandId);
            return (
              <div key={post.id}>
                <PostCard
                  post={post}
                  brandName={brand?.name}
                  onDelete={remove}
                  showActions={true}
                />
                <div className="mt-1 px-1">
                  <button
                    onClick={() => openEdit(post)}
                    className="text-xs text-blue-500 hover:underline dark:text-blue-400"
                  >
                    ✏️ 内容・時間を編集
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 編集モーダル */}
      {editPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">
              予約投稿を編集
            </h3>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              投稿内容
            </label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              投稿日時（日本時間）
            </label>
            <input
              type="datetime-local"
              value={editDateTime}
              onChange={(e) => setEditDateTime(e.target.value)}
              min={toLocalDateTimeString(new Date())}
              className="mb-6 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setEditPost(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !editContent.trim()}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
