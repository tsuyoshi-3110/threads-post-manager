"use client";

import { usePosts } from "@/hooks/usePosts";
import { useBrands } from "@/hooks/useBrands";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const { user } = useAuth();
  const { posts: drafts } = usePosts("draft");
  const { posts: scheduled } = usePosts("scheduled");
  const { posts: published } = usePosts("published");
  const { brands } = useBrands();

  const stats = [
    {
      label: "下書き",
      value: drafts.length,
      href: "/drafts",
      color: "text-gray-700 dark:text-gray-300",
      bg: "bg-gray-50 dark:bg-gray-800",
    },
    {
      label: "予約中",
      value: scheduled.length,
      href: "/scheduled",
      color: "text-yellow-700 dark:text-yellow-400",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
    },
    {
      label: "投稿済み",
      value: published.length,
      href: "/history",
      color: "text-green-700 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "ブランド数",
      value: brands.length,
      href: "/brands",
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ダッシュボード
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {user?.email} でログイン中
          </p>
        </div>
        <Link href="/create">
          <Button>✏️ 新規投稿作成</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div
              className={`rounded-xl ${stat.bg} border border-gray-200 p-5 transition-shadow hover:shadow-md dark:border-gray-700`}
            >
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
              <p className={`mt-1 text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {brands.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            まずブランドを設定してください
          </p>
          <Link href="/brands" className="mt-3 inline-block">
            <Button variant="secondary" size="sm">
              ブランド設定へ
            </Button>
          </Link>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              最近の下書き
            </h3>
            <Link
              href="/drafts"
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              すべて見る
            </Link>
          </div>
          <div className="space-y-2">
            {drafts.slice(0, 3).map((post) => {
              const brand = brands.find((b) => b.id === post.brandId);
              return (
                <div
                  key={post.id}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                    {brand && (
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {brand.name}
                      </span>
                    )}
                    {post.aiGenerated && (
                      <span className="text-purple-500 dark:text-purple-400">
                        AI生成
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-gray-700 dark:text-gray-300">
                    {post.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
