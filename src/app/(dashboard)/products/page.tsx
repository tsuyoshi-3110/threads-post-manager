"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { createProduct, updateProduct, deleteProduct } from "@/lib/firebase/firestore";
import { ImageUploader } from "@/components/post/ImageUploader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Product, PriceType } from "@/types";

const PRICE_TYPE_OPTIONS: { value: PriceType; label: string; desc: string }[] = [
  { value: "onetime",      label: "単発購入",         desc: "買い切り型" },
  { value: "subscription", label: "サブスク",          desc: "月額・年額" },
  { value: "both",         label: "単発＋サブスク",    desc: "両方あり" },
];

const PRICE_TYPE_LABEL: Record<PriceType, string> = {
  onetime:      "単発購入",
  subscription: "サブスク",
  both:         "単発＋サブスク",
};

const EMPTY_FORM = {
  name: "",
  tagline: "",
  description: "",
  priceType: "onetime" as PriceType,
  price: "",
  subscriptionPrice: "",
  targetAudience: "",
  featuresText: "",   // テキストエリア用（改行区切り）
  url: "",
  imageUrl: null as string | null,
  imageUrls: null as string[] | null,
};

export default function ProductsPage() {
  const { user } = useAuth();
  const { products, loading, refetch } = useProducts();

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openNew = () => {
    setEditingProduct(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      priceType: p.priceType ?? "onetime",
      price: p.price,
      subscriptionPrice: p.subscriptionPrice ?? "",
      targetAudience: p.targetAudience,
      featuresText: p.features.join("\n"),
      url: p.url,
      imageUrl: p.imageUrl,
      imageUrls: p.imageUrls,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const features = form.featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      const data = {
        userId: user.uid,
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        priceType: form.priceType,
        price: form.price.trim(),
        subscriptionPrice: form.subscriptionPrice.trim(),
        targetAudience: form.targetAudience.trim(),
        features,
        url: form.url.trim(),
        imageUrl: form.imageUrl,
        imageUrls: form.imageUrls,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
      } else {
        await createProduct(data);
      }
      await refetch();
      setShowModal(false);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この製品を削除しますか？")) return;
    await deleteProduct(id);
    await refetch();
  };

  if (loading) return <LoadingSpinner className="py-20" />;

  const fieldClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">製品管理</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            販売製品の情報を登録してAIの投稿生成に活用します
          </p>
        </div>
        <Button onClick={openNew}>＋ 製品を追加</Button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="text-4xl">📦</div>
          <p className="mt-3 text-gray-500 dark:text-gray-400">製品がまだ登録されていません</p>
          <Button className="mt-4" onClick={openNew}>最初の製品を登録</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{p.name}</h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {PRICE_TYPE_LABEL[p.priceType ?? "onetime"]}
                    </span>
                  </div>
                  {p.tagline && (
                    <p className="mt-0.5 text-sm text-blue-600 dark:text-blue-400">{p.tagline}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="rounded-lg border border-red-300 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    削除
                  </button>
                </div>
              </div>

              {/* 製品画像プレビュー */}
              {p.imageUrl && (
                <img src={p.imageUrl} alt={p.name} className="mt-3 h-40 w-full rounded-lg object-cover" />
              )}

              <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                {/* 価格表示 */}
                {(p.price || p.subscriptionPrice) && (
                  <div className="flex gap-2">
                    <span className="shrink-0 font-medium text-gray-500 dark:text-gray-400">価格</span>
                    <span>
                      {p.priceType === "both"
                        ? [p.price, p.subscriptionPrice].filter(Boolean).join(" / ")
                        : p.price || p.subscriptionPrice}
                    </span>
                  </div>
                )}
                {p.targetAudience && (
                  <div className="flex gap-2">
                    <span className="shrink-0 font-medium text-gray-500 dark:text-gray-400">対象</span>
                    <span>{p.targetAudience}</span>
                  </div>
                )}
                {p.url && (
                  <div className="flex gap-2">
                    <span className="shrink-0 font-medium text-gray-500 dark:text-gray-400">URL</span>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="truncate text-blue-500 hover:underline">
                      {p.url}
                    </a>
                  </div>
                )}
              </div>

              {p.features.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">特徴・メリット</p>
                  <ul className="space-y-0.5">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                        <span className="mt-0.5 text-green-500">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {p.description && (
                <p className="mt-3 line-clamp-3 text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 追加・編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-5 text-base font-semibold text-gray-900 dark:text-gray-100">
              {editingProduct ? "製品を編集" : "製品を追加"}
            </h3>

            <div className="space-y-4">
              {/* 製品名 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  製品名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例：pageit"
                  className={fieldClass}
                />
              </div>

              {/* キャッチコピー */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  キャッチコピー
                </label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                  placeholder="例：AIで誰でも簡単にホームページが作れる"
                  className={fieldClass}
                />
              </div>

              {/* 製品説明 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  製品説明
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="製品の詳細・特徴を入力..."
                  className={fieldClass}
                />
              </div>

              {/* 価格タイプ */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  価格タイプ
                </label>
                <div className="flex gap-2">
                  {PRICE_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, priceType: opt.value }))}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                        form.priceType === opt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div>{opt.label}</div>
                      <div className="mt-0.5 text-gray-400 dark:text-gray-500" style={{ fontSize: "10px" }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 価格入力 */}
              <div className={`grid gap-3 ${form.priceType === "both" ? "grid-cols-2" : "grid-cols-1"}`}>
                {(form.priceType === "onetime" || form.priceType === "both") && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      単発価格
                    </label>
                    <input
                      type="text"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="例：¥19,800（買い切り）"
                      className={fieldClass}
                    />
                  </div>
                )}
                {(form.priceType === "subscription" || form.priceType === "both") && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      サブスク価格
                    </label>
                    <input
                      type="text"
                      value={form.subscriptionPrice}
                      onChange={(e) => setForm((f) => ({ ...f, subscriptionPrice: e.target.value }))}
                      placeholder="例：¥980/月"
                      className={fieldClass}
                    />
                  </div>
                )}
              </div>

              {/* ターゲット */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  ターゲット
                </label>
                <input
                  type="text"
                  value={form.targetAudience}
                  onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
                  placeholder="例：個人事業主・中小企業"
                  className={fieldClass}
                />
              </div>

              {/* 特徴・メリット（テキストエリア） */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  特徴・メリット（1行に1つ入力）
                </label>
                <textarea
                  rows={5}
                  value={form.featuresText}
                  onChange={(e) => setForm((f) => ({ ...f, featuresText: e.target.value }))}
                  placeholder={`例：\nAIが自動で文章を生成\n24時間チャット対応\nノーコードで構築可能`}
                  className={fieldClass}
                />
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {form.featuresText.split("\n").filter((l) => l.trim()).length} 件入力済み
                </p>
              </div>

              {/* URL */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  LP・販売ページ URL
                </label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                  className={fieldClass}
                />
              </div>

              {/* 製品画像 */}
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  製品画像
                </label>
                <ImageUploader
                  value={form.imageUrl ?? ""}
                  onChange={(url) => setForm((f) => ({ ...f, imageUrl: url || null }))}
                  onRemove={() => setForm((f) => ({ ...f, imageUrl: null }))}
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="mt-6 flex gap-3">
              <Button onClick={handleSave} loading={saving} disabled={!form.name.trim()} className="flex-1">
                保存
              </Button>
              <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
