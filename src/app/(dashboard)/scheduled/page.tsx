"use client";

import { useState } from "react";
import { usePosts } from "@/hooks/usePosts";
import { useBrands } from "@/hooks/useBrands";
import { PostCard } from "@/components/post/PostCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ScheduledPage() {
  const { posts, loading, remove } = usePosts("scheduled");
  const { brands } = useBrands();
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

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
              <PostCard
                key={post.id}
                post={post}
                brandName={brand?.name}
                onDelete={remove}
                showActions={true}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
