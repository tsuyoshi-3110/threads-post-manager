"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBrands } from "@/hooks/useBrands";
import { useProducts } from "@/hooks/useProducts";
import { createPost } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Timestamp } from "firebase/firestore";
import { PostPurpose } from "@/types";

type Period = "1week" | "2weeks" | "1month";
type BalanceMode = "daily_heavy" | "balanced" | "promo_heavy";
type PurposeType = "daily" | "soft" | "promotion";

interface PlanItem {
  id: string;
  date: string;
  time: string;
  purpose: PurposeType;
  ideaTitle: string;
  ideaDescription: string;
  content: string;
  generating: boolean;
  selected: boolean;
  editing: boolean;
}

const PURPOSE_LABEL: Record<PurposeType, string> = {
  daily: "日常",
  soft: "💡ソフト誘導",
  promotion: "📣商品紹介",
};

const PURPOSE_COLOR: Record<PurposeType, string> = {
  daily: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  soft: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  promotion: "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

const BALANCE_OPTIONS: { value: BalanceMode; label: string; desc: string }[] = [
  { value: "daily_heavy", label: "日常重視", desc: "日常80% / ソフト15% / 商品5%" },
  { value: "balanced",    label: "バランス", desc: "日常70% / ソフト20% / 商品10%" },
  { value: "promo_heavy", label: "販促強化", desc: "日常50% / ソフト30% / 商品20%" },
];

let _itemCounter = 0;
const newId = () => `item_${++_itemCounter}_${Date.now()}`;

export default function PlannerPage() {
  const { user } = useAuth();
  const { brands } = useBrands();
  const { products } = useProducts();

  // 設定
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [period, setPeriod] = useState<Period>("1week");
  const [postsPerDay, setPostsPerDay] = useState<1 | 2>(1);
  const [balanceMode, setBalanceMode] = useState<BalanceMode>("balanced");

  // プラン
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedItems = planItems.filter((i) => i.selected);
  const hasContent = planItems.some((i) => i.content);

  // プラン生成
  const generatePlan = async () => {
    if (!selectedBrand) return;
    setGeneratingPlan(true);
    setError("");
    setPlanItems([]);
    try {
      const res = await fetch("/api/ai/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: { name: selectedBrand.name, description: selectedBrand.description },
          product: selectedProduct ?? null,
          period,
          postsPerDay,
          balanceMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "プランの生成に失敗しました");

      const items: PlanItem[] = data.plan.map((p: Omit<PlanItem, "id" | "content" | "generating" | "selected" | "editing">) => ({
        ...p,
        id: newId(),
        content: "",
        generating: false,
        selected: true,
        editing: false,
      }));
      setPlanItems(items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  // 個別に投稿文を生成
  const generateContent = async (id: string) => {
    const item = planItems.find((i) => i.id === id);
    if (!item || !selectedBrand) return;

    setPlanItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, generating: true } : i))
    );
    try {
      const res = await fetch("/api/ai/generate-from-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: { name: selectedBrand.name, description: selectedBrand.description },
          product: selectedProduct ?? null,
          purpose: item.purpose,
          ideaTitle: item.ideaTitle,
          ideaDescription: item.ideaDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlanItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, content: data.content, generating: false } : i))
      );
    } catch {
      setPlanItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, generating: false } : i))
      );
    }
  };

  // 選択した投稿文を一括生成（3件ずつ並列）
  const generateAllSelected = async () => {
    const targets = selectedItems.filter((i) => !i.content);
    for (let i = 0; i < targets.length; i += 3) {
      const batch = targets.slice(i, i + 3);
      await Promise.all(batch.map((item) => generateContent(item.id)));
    }
  };

  // すべて予約投稿に追加
  const saveAllScheduled = async () => {
    if (!user || !selectedBrand) return;
    const toSave = planItems.filter((i) => i.selected && i.content);
    if (toSave.length === 0) return;
    setSavingAll(true);
    setError("");
    try {
      await Promise.all(
        toSave.map((item) => {
          const dt = new Date(`${item.date}T${item.time}:00`);
          return createPost({
            brandId: selectedBrand.id,
            userId: user.uid,
            content: item.content,
            status: "scheduled",
            scheduledAt: Timestamp.fromDate(dt),
            publishedAt: null,
            threadsPostId: null,
            imageUrl: null,
            imageUrls: null,
            videoUrl: null,
            postPurpose: item.purpose === "daily" ? null : (item.purpose as PostPurpose),
            productId: selectedProductId || null,
            aiGenerated: true,
            aiPrompt: item.ideaTitle,
          });
        })
      );
      setSuccessMsg(`${toSave.length} 件を予約投稿に追加しました！`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSavingAll(false);
    }
  };

  // 下書きとして保存
  const saveAllDrafts = async () => {
    if (!user || !selectedBrand) return;
    const toSave = planItems.filter((i) => i.selected && i.content);
    if (toSave.length === 0) return;
    setSavingAll(true);
    setError("");
    try {
      await Promise.all(
        toSave.map((item) =>
          createPost({
            brandId: selectedBrand.id,
            userId: user.uid,
            content: item.content,
            status: "draft",
            scheduledAt: null,
            publishedAt: null,
            threadsPostId: null,
            imageUrl: null,
            imageUrls: null,
            videoUrl: null,
            postPurpose: item.purpose === "daily" ? null : (item.purpose as PostPurpose),
            productId: selectedProductId || null,
            aiGenerated: true,
            aiPrompt: item.ideaTitle,
          })
        )
      );
      setSuccessMsg(`${toSave.length} 件を下書きに保存しました！`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSavingAll(false);
    }
  };

  const toggleSelect = (id: string) =>
    setPlanItems((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));

  const toggleAll = () => {
    const allSelected = planItems.every((i) => i.selected);
    setPlanItems((prev) => prev.map((i) => ({ ...i, selected: !allSelected })));
  };

  const updateContent = (id: string, content: string) =>
    setPlanItems((prev) => prev.map((i) => (i.id === id ? { ...i, content } : i)));

  const updateDateTime = (id: string, field: "date" | "time", value: string) =>
    setPlanItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const removeItem = (id: string) =>
    setPlanItems((prev) => prev.filter((i) => i.id !== id));

  if (!brands.length) return <LoadingSpinner className="py-20" />;

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI 投稿プランナー</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          ネタ出し → 投稿文生成 → 一括予約投稿まで自動化
        </p>
      </div>

      {/* ── 設定パネル ── */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">① プランの設定</h3>

        <div className="space-y-4">
          {/* ブランド */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">ブランド</label>
            <div className="flex flex-wrap gap-2">
              {brands.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBrandId(b.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedBrandId === b.id
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* 製品（任意） */}
          {products.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                紹介製品（任意）
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedProductId("")}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    !selectedProductId
                      ? "border-gray-500 bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
                      : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  なし
                </button>
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedProductId === p.id
                        ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* 期間 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">期間</label>
              <div className="flex gap-1.5">
                {(["1week", "2weeks", "1month"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                      period === p
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {p === "1week" ? "1週間" : p === "2weeks" ? "2週間" : "1ヶ月"}
                  </button>
                ))}
              </div>
            </div>

            {/* 1日の投稿数 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">1日の投稿数</label>
              <div className="flex gap-1.5">
                {([1, 2] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPostsPerDay(n)}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                      postsPerDay === n
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {n === 1 ? "1回" : "2回"}
                  </button>
                ))}
              </div>
            </div>

            {/* 内容バランス */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">内容バランス</label>
              <div className="flex gap-1.5">
                {BALANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBalanceMode(opt.value)}
                    title={opt.desc}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                      balanceMode === opt.value
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {BALANCE_OPTIONS.find((o) => o.value === balanceMode)?.desc}
              </p>
            </div>
          </div>

          <Button
            onClick={generatePlan}
            loading={generatingPlan}
            disabled={!selectedBrandId}
            className="w-full sm:w-auto"
          >
            ✨ ネタ出しプランを生成
          </Button>
        </div>
      </div>

      {/* ── エラー・成功メッセージ ── */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
          ✅ {successMsg}
        </div>
      )}

      {/* ── 生成中インジケーター ── */}
      {generatingPlan && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-8 text-center dark:border-purple-800/40 dark:bg-purple-900/20">
          <LoadingSpinner className="mx-auto mb-3" />
          <p className="text-sm text-purple-700 dark:text-purple-300">
            AIがコンテンツプランを考えています...
          </p>
        </div>
      )}

      {/* ── プラン一覧 ── */}
      {planItems.length > 0 && (
        <div className="space-y-4">
          {/* ヘッダーアクション */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAll}
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                {planItems.every((i) => i.selected) ? "全解除" : "全選択"}
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {planItems.length} 件 / 選択 {selectedItems.length} 件 / 投稿文あり {planItems.filter((i) => i.content).length} 件
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={generateAllSelected}
                disabled={selectedItems.filter((i) => !i.content).length === 0}
              >
                🤖 選択した投稿文を一括生成
              </Button>
            </div>
          </div>

          {/* プランカード一覧 */}
          <div className="space-y-3">
            {planItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border bg-white p-4 shadow-sm transition-opacity dark:bg-gray-800 ${
                  item.selected
                    ? "border-blue-200 dark:border-blue-800/50"
                    : "border-gray-200 opacity-60 dark:border-gray-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* チェックボックス */}
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleSelect(item.id)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
                  />

                  <div className="flex-1 min-w-0">
                    {/* 上段: 日時・目的・タイトル */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => updateDateTime(item.id, "date", e.target.value)}
                          className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                        />
                        <input
                          type="time"
                          value={item.time}
                          onChange={(e) => updateDateTime(item.id, "time", e.target.value)}
                          className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                        />
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PURPOSE_COLOR[item.purpose]}`}>
                        {PURPOSE_LABEL[item.purpose]}
                      </span>
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.ideaTitle}</span>
                    </div>

                    {/* アイデア説明 */}
                    <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{item.ideaDescription}</p>

                    {/* 投稿文エリア */}
                    {item.content ? (
                      <div>
                        <textarea
                          value={item.content}
                          onChange={(e) => updateContent(item.id, e.target.value)}
                          rows={4}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-900 focus:border-blue-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100"
                        />
                        <p className="mt-0.5 text-right text-xs text-gray-400">{item.content.length} 文字</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 py-4 text-center dark:border-gray-600">
                        <p className="text-xs text-gray-400 dark:text-gray-500">投稿文未生成</p>
                      </div>
                    )}
                  </div>

                  {/* 右側アクション */}
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      onClick={() => generateContent(item.id)}
                      disabled={item.generating}
                      className="rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    >
                      {item.generating ? "生成中..." : item.content ? "再生成" : "生成"}
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── 保存アクション ── */}
          {hasContent && (
            <div className="sticky bottom-20 md:bottom-4 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                投稿文あり {planItems.filter((i) => i.content && i.selected).length} 件を保存
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={saveAllDrafts}
                  loading={savingAll}
                  disabled={!planItems.some((i) => i.selected && i.content)}
                >
                  📝 下書きとして保存
                </Button>
                <Button
                  onClick={saveAllScheduled}
                  loading={savingAll}
                  disabled={!planItems.some((i) => i.selected && i.content)}
                >
                  🗓️ 予約投稿に追加
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
