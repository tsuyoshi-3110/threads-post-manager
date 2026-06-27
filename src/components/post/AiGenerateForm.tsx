"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BrandName } from "@/types";

interface Props {
  brandName: BrandName;
  brandDescription?: string;
  onGenerated: (content: string) => void;
}

export const AiGenerateForm = ({ brandName, brandDescription, onGenerated }: Props) => {
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<"casual" | "professional" | "friendly">("casual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedText, setGeneratedText] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setGeneratedText("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, brandName, brandDescription, tone }),
      });
      if (!res.ok) throw new Error("生成に失敗しました");
      const data = await res.json();
      setGeneratedText(data.content);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedText.trim()) return;
    onGenerated(generatedText);
    setGeneratedText("");
  };

  const fieldClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-purple-400";

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800/50 dark:bg-purple-900/20">
      <h3 className="mb-3 text-sm font-semibold text-purple-800 dark:text-purple-300">
        ✨ AI で投稿文を生成
      </h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            投稿のテーマ・キーワード
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="例：新サービスのローンチについて告知したい"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            トーン
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as typeof tone)}
            className={fieldClass}
          >
            <option value="casual">カジュアル</option>
            <option value="professional">プロフェッショナル</option>
            <option value="friendly">フレンドリー</option>
          </select>
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <Button
          onClick={handleGenerate}
          loading={loading}
          disabled={!prompt.trim()}
          className="w-full"
        >
          生成する
        </Button>

        {/* 生成結果プレビュー＆編集エリア */}
        {generatedText && (
          <div className="space-y-2 border-t border-purple-200 pt-3 dark:border-purple-700/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
                生成結果（直接編集できます）
              </p>
              <span className="text-xs text-gray-400">{generatedText.length} 文字</span>
            </div>
            <textarea
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-purple-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="flex gap-2">
              <Button onClick={handleApply} className="flex-1">
                ✅ この内容を使う
              </Button>
              <button
                onClick={() => setGeneratedText("")}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                破棄
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
