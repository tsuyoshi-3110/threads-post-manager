"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";

function TokenResult() {
  const params = useSearchParams();
  const token = params.get("token");
  const userId = params.get("userId");
  const error = params.get("error");

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">エラーが発生しました</p>
        <p className="mt-1 text-xs text-red-600 dark:text-red-500 break-all">{error}</p>
      </div>
    );
  }

  if (token && userId) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3">
            ✅ 取得成功！以下の値をブランド設定画面に入力してください
          </p>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Threads User ID
              </p>
              <code className="block w-full rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm break-all">
                {userId}
              </code>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Threads Access Token（長期トークン）
              </p>
              <code className="block w-full rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs break-all">
                {token}
              </code>
            </div>
          </div>
        </div>

        <a href="/brands">
          <Button className="w-full">ブランド設定画面へ</Button>
        </a>
      </div>
    );
  }

  const appId = process.env.NEXT_PUBLIC_THREADS_APP_ID;
  const redirectUri = `${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/threads/callback`;
  const authUrl = `https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=threads_basic,threads_content_publish&response_type=code`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Threads アカウントを連携してアクセストークンを取得します。
      </p>
      <a href={authUrl}>
        <Button className="w-full">Threads で認証する</Button>
      </a>
    </div>
  );
}

export default function ThreadsAuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100">
          Threads アクセストークン取得
        </h1>
        <Suspense fallback={<p className="text-sm text-gray-500">読み込み中...</p>}>
          <TokenResult />
        </Suspense>
      </div>
    </div>
  );
}
