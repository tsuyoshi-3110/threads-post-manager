"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { logOut } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
  { href: "/create", label: "投稿作成", icon: "✏️" },
  { href: "/studio", label: "AI スタジオ", icon: "✨" },
  { href: "/drafts", label: "下書き", icon: "📝" },
  { href: "/scheduled", label: "予約投稿", icon: "🕐" },
  { href: "/calendar", label: "カレンダー", icon: "📅" },
  { href: "/analytics", label: "分析", icon: "📈" },
  { href: "/history", label: "投稿履歴", icon: "📋" },
  { href: "/brands", label: "ブランド設定", icon: "🏷️" },
];

const BOTTOM_TABS = [
  { href: "/dashboard", label: "ホーム", icon: "📊" },
  { href: "/create", label: "作成", icon: "✏️" },
  { href: "/studio", label: "AI", icon: "✨" },
  { href: "/drafts", label: "下書き", icon: "📝" },
];

const MORE_ITEMS = [
  { href: "/scheduled", label: "予約投稿", icon: "🕐" },
  { href: "/calendar", label: "カレンダー", icon: "📅" },
  { href: "/analytics", label: "分析", icon: "📈" },
  { href: "/history", label: "投稿履歴", icon: "📋" },
  { href: "/brands", label: "ブランド設定", icon: "🏷️" },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = async () => {
    await logOut();
    router.push("/login");
  };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex h-full w-60 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Threads Manager
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-gray-200 p-3 dark:border-gray-700 space-y-1">
          <a
            href="https://www.threads.net"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <span>🧵</span>
            Threads を開く
          </a>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <span>🚪</span>
            ログアウト
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-gray-200 bg-white md:hidden dark:border-gray-700 dark:bg-gray-900">
        {BOTTOM_TABS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors",
              pathname === item.href
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-gray-500 dark:text-gray-400"
        >
          <span className="text-xl leading-none">☰</span>
          <span>メニュー</span>
        </button>
      </nav>

      {/* ── Mobile more drawer ── */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white pb-8 md:hidden dark:bg-gray-900">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">メニュー</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 p-4">
              {MORE_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={clsx(
                    "flex flex-col items-center rounded-2xl p-3 text-xs transition-colors",
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="mt-1 text-center leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="mx-4 border-t border-gray-100 pt-3 dark:border-gray-800 space-y-1">
              <a
                href="https://www.threads.net"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span>🧵</span>Threads を開く
              </a>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span>🚪</span>ログアウト
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
