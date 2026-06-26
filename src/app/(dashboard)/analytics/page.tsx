"use client";

import { useState, useEffect } from "react";
import { useBrands } from "@/hooks/useBrands";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import ReactMarkdown from "react-markdown";

interface InsightValue {
  name: string;
  period: string;
  value?: number;
  values?: { value: number; end_time?: string }[];
  title: string;
  description: string;
  id: string;
}

const extractValue = (item: InsightValue): number => {
  if (typeof item.value === "number") return item.value;
  if (Array.isArray(item.values) && item.values.length > 0) {
    return item.values[item.values.length - 1].value ?? 0;
  }
  return 0;
};

interface PostInsight {
  postId: string;
  text: string;
  timestamp: string;
  metrics: Record<string, number>;
}

interface UserStats {
  views: number;
  followers_count: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}

const METRIC_LABELS: Record<string, { label: string; icon: string }> = {
  views: { label: "表示回数", icon: "👁️" },
  likes: { label: "いいね", icon: "❤️" },
  replies: { label: "返信", icon: "💬" },
  reposts: { label: "リポスト", icon: "🔁" },
  quotes: { label: "引用", icon: "📝" },
  followers_count: { label: "フォロワー", icon: "👥" },
};

function ExpandablePostCard({ post }: { post: PostInsight }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = post.text.length > 80;

  return (
    <div
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      onClick={() => isLong && setExpanded((v) => !v)}
    >
      <p className={`mb-3 text-sm text-gray-900 dark:text-gray-100 ${!expanded && isLong ? "line-clamp-2" : ""}`}>
        {post.text || "（テキストなし）"}
      </p>
      {isLong && (
        <p className="mb-2 text-xs text-blue-500 dark:text-blue-400">
          {expanded ? "▲ 折りたたむ" : "▼ 全文を表示"}
        </p>
      )}
      <div className="flex flex-wrap gap-4">
        {(["views", "likes", "replies", "reposts", "quotes"] as const).map((key) => {
          const meta = METRIC_LABELS[key];
          return (
            <div key={key} className="flex items-center gap-1 text-sm">
              <span>{meta.icon}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {(post.metrics[key] ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{meta.label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        {new Date(post.timestamp).toLocaleString("ja-JP")}
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { brands, loading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [postInsights, setPostInsights] = useState<PostInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  useEffect(() => {
    if (!selectedBrand) return;
    const fetchAll = async () => {
      setLoading(true);
      setError("");
      setUserStats(null);
      setPostInsights([]);

      const { threadsUserId, threadsAccessToken } = selectedBrand;

      try {
        // ユーザー全体のインサイト
        const userParams = new URLSearchParams({ threadsUserId, accessToken: threadsAccessToken, type: "user" });
        const userRes = await fetch(`/api/threads/insights?${userParams}`);
        const userData = await userRes.json();

        if (userRes.ok && userData.data) {
          const stats: Partial<UserStats> = {};
          for (const item of userData.data as InsightValue[]) {
            stats[item.name as keyof UserStats] = extractValue(item);
          }
          setUserStats(stats as UserStats);
        }

        // 投稿一覧を取得してから各投稿のインサイトを取得
        const listParams = new URLSearchParams({
          threadsUserId,
          accessToken: threadsAccessToken,
        });
        const listRes = await fetch(`/api/threads/list?${listParams}`);
        if (!listRes.ok) return;
        const listData = await listRes.json();
        const posts: { id: string; text?: string; timestamp: string }[] = listData.data ?? [];

        const insights: PostInsight[] = await Promise.all(
          posts.slice(0, 10).map(async (post) => {
            const p = new URLSearchParams({
              threadsUserId,
              accessToken: threadsAccessToken,
              type: "post",
              postId: post.id,
            });
            const r = await fetch(`/api/threads/insights?${p}`);
            const d = await r.json();
            const metrics: Record<string, number> = {};
            if (r.ok && d.data) {
              for (const item of d.data as InsightValue[]) {
                metrics[item.name] = extractValue(item);
              }
            }
            return { postId: post.id, text: post.text ?? "", timestamp: post.timestamp, metrics };
          })
        );
        setPostInsights(insights);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [selectedBrand]);

  const runAiAnalysis = async () => {
    if (!selectedBrand || postInsights.length === 0) return;
    setAiLoading(true);
    setAiAnalysis("");
    try {
      const posts = postInsights.map((p) => ({
        text: p.text,
        timestamp: p.timestamp,
        views: p.metrics.views ?? 0,
        likes: p.metrics.likes ?? 0,
        replies: p.metrics.replies ?? 0,
        reposts: p.metrics.reposts ?? 0,
        quotes: p.metrics.quotes ?? 0,
      }));
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posts,
          brandName: selectedBrand.name,
          totalViews: userStats?.views ?? 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "分析に失敗しました");
      setAiAnalysis(data.analysis);
    } catch (e) {
      setAiAnalysis(`エラー: ${(e as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  };

  if (brandsLoading) return <LoadingSpinner className="py-20" />;
  if (brands.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
        <p className="text-gray-400 dark:text-gray-500">ブランドが設定されていません</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">分析</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Threads アカウントのパフォーマンスを確認します
        </p>
      </div>

      {/* ブランドタブ */}
      <div className="mb-6 flex flex-wrap gap-2">
        {brands.map((brand) => (
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
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner className="py-20" />}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {/* アカウント全体の統計 */}
          {userStats && (
            <div className="mb-8">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                アカウント全体
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(["followers_count", "views", "likes", "replies", "reposts", "quotes"] as const).map((key) => {
                  const meta = METRIC_LABELS[key];
                  const value = userStats[key] ?? 0;
                  return (
                    <div key={key} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                      <div className="text-2xl">{meta.icon}</div>
                      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {value.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{meta.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 投稿ごとのインサイト */}
          {postInsights.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                投稿別パフォーマンス
              </h3>
              <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
                ※ 投稿単位の表示回数は Threads API が開発中のため、アカウント全体の合計と一致しない場合があります
              </p>
              <div className="space-y-3">
                {postInsights.map((post) => (
                  <ExpandablePostCard key={post.postId} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* AI 分析セクション */}
          {postInsights.length > 0 && (
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  ✨ AI 投稿アドバイス
                </h3>
                <button
                  onClick={runAiAnalysis}
                  disabled={aiLoading}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {aiLoading ? "分析中..." : aiAnalysis ? "再分析" : "AI に分析してもらう"}
                </button>
              </div>

              {aiLoading && (
                <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 p-6 dark:border-purple-800/50 dark:bg-purple-900/20">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">投稿データを分析中...</p>
                </div>
              )}

              {aiAnalysis && !aiLoading && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 dark:border-purple-800/50 dark:bg-purple-900/20">
                  <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200
                    [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:dark:text-gray-100
                    [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:dark:text-gray-100 [&_h2]:mt-4 [&_h2]:mb-1
                    [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-purple-700 [&_h3]:dark:text-purple-300 [&_h3]:mt-3
                    [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2
                    [&_ul]:text-sm [&_ul]:pl-4 [&_ul]:space-y-1
                    [&_li]:text-sm [&_strong]:text-gray-900 [&_strong]:dark:text-gray-100">
                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                  </div>
                </div>
              )}

              {!aiAnalysis && !aiLoading && (
                <div className="rounded-xl border border-dashed border-purple-300 p-6 text-center dark:border-purple-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    「AI に分析してもらう」を押すと、投稿データをもとに<br />
                    最適な投稿時間・コンテンツのアドバイスが届きます
                  </p>
                </div>
              )}
            </div>
          )}

          {!userStats && postInsights.length === 0 && !error && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
              <p className="text-gray-400 dark:text-gray-500">データがありません</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
