"use client";

import { useState, useMemo } from "react";
import { usePosts } from "@/hooks/usePosts";
import { useBrands } from "@/hooks/useBrands";
import { Post } from "@/types";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import { useRouter } from "next/navigation";

const BRAND_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-green-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-yellow-400",
  published: "bg-green-400",
  draft: "bg-gray-400",
  failed: "bg-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "予約",
  published: "投稿済",
  draft: "下書き",
  failed: "失敗",
};

export default function CalendarPage() {
  const { posts, loading } = usePosts();
  const { brands } = useBrands();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const brandColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    brands.forEach((b, i) => {
      map[b.id] = BRAND_COLORS[i % BRAND_COLORS.length];
    });
    return map;
  }, [brands]);

  // カレンダーのグリッド日付を生成
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // 日付ごとの投稿マップ
  const postsByDate = useMemo(() => {
    const map: Record<string, Post[]> = {};
    posts.forEach((post) => {
      const date = post.scheduledAt?.toDate() ?? post.publishedAt?.toDate() ?? post.createdAt?.toDate();
      if (!date) return;
      const key = format(date, "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [posts]);

  const selectedPosts = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, "yyyy-MM-dd");
    return postsByDate[key] ?? [];
  }, [selectedDay, postsByDate]);

  const weekDays = ["月", "火", "水", "木", "金", "土", "日"];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          投稿カレンダー
        </h2>
        <button
          onClick={() => router.push("/create")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 投稿を作成
        </button>
      </div>

      <div className="flex gap-6">
        {/* カレンダー本体 */}
        <div className="flex-1">
          {/* 月ナビゲーション */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              ← 前月
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {format(currentMonth, "yyyy年 M月", { locale: ja })}
            </h3>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              次月 →
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekDays.map((d, i) => (
              <div key={d} className={`py-1 text-center text-xs font-medium ${
                i === 5 ? "text-blue-500" : i === 6 ? "text-red-500" : "text-gray-500 dark:text-gray-400"
              }`}>
                {d}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayPosts = postsByDate[key] ?? [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const isWeekend = day.getDay() === 6 || day.getDay() === 0;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                  className={`relative min-h-16 rounded-lg border p-1.5 text-left transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                  } ${!isCurrentMonth ? "opacity-40" : ""}`}
                >
                  <span className={`text-xs font-medium ${
                    isToday(day)
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"
                      : isWeekend
                      ? day.getDay() === 6 ? "text-blue-500" : "text-red-500"
                      : "text-gray-700 dark:text-gray-300"
                  }`}>
                    {format(day, "d")}
                  </span>

                  {/* 投稿ドット */}
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {dayPosts.slice(0, 4).map((post) => (
                      <span
                        key={post.id}
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[post.status] ?? "bg-gray-400"}`}
                        title={post.content.slice(0, 30)}
                      />
                    ))}
                    {dayPosts.length > 4 && (
                      <span className="text-xs text-gray-400">+{dayPosts.length - 4}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 凡例 */}
          <div className="mt-4 flex flex-wrap gap-4">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status]}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 選択日の投稿一覧 */}
        <div className="w-72 shrink-0">
          {selectedDay ? (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {format(selectedDay, "M月d日（E）", { locale: ja })}
              </h4>
              {selectedPosts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
                  <p className="text-xs text-gray-400 dark:text-gray-500">投稿なし</p>
                  <button
                    onClick={() => router.push("/create")}
                    className="mt-2 text-xs text-blue-500 hover:underline"
                  >
                    + 投稿を作成
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedPosts.map((post) => {
                    const brand = brands.find((b) => b.id === post.brandId);
                    const brandColor = brandColorMap[post.brandId] ?? "bg-gray-500";
                    return (
                      <div key={post.id} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[post.status]}`} />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {STATUS_LABELS[post.status]}
                          </span>
                          {brand && (
                            <span className={`rounded-full px-1.5 py-0.5 text-xs text-white ${brandColor}`}>
                              {brand.name}
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-3 text-xs leading-relaxed text-gray-800 dark:text-gray-200">
                          {post.content}
                        </p>
                        {post.scheduledAt && post.status === "scheduled" && (
                          <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                            {format(post.scheduledAt.toDate(), "HH:mm")} 投稿予定
                          </p>
                        )}
                        {post.publishedAt && post.status === "published" && (
                          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                            {format(post.publishedAt.toDate(), "HH:mm")} 投稿済み
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                日付をクリックすると<br />投稿が表示されます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
