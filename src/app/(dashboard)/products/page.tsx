"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { createProduct, updateProduct, deleteProduct } from "@/lib/firebase/firestore";
import { ImageUploader } from "@/components/post/ImageUploader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Product } from "@/types";

const EMPTY_FORM = {
  name: "",
  tagline: "",
  description: "",
  price: "",
  targetAudience: "",
  features: [""],
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
      price: p.price,
      targetAudience: p.targetAudience,
      features: p.features.length > 0 ? [...p.features] : [""],
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
      const data = {
        userId: user.uid,
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        price: form.price.trim(),
        targetAudience: form.targetAudience.trim(),
        features: form.features.filter(Boolean),
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

  const updateFeature = (i: number, val: string) => {
    const next = [...form.features];
    next[i] = val;
    setForm((f) => ({ ...f, features: next }));
  };

  const addFeature = () => setForm((f) => ({ ...f, features: [...f.features, ""] }));
  const removeFeature = (i: number) =>
    setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));

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
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{p.name}</h3>
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
              {p.imageUrls && p.imageUrls.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {p.imageUrls.map((url, i) => (
                    <img key={i} src={url} alt={`${p.name} ${i + 1}`} className="h-24 w-24 shrink-0 rounded-lg object-cover" />
                  ))}
                </div>
              )}

              <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                {p.price && (
                  <div className="flex gap-2">
                    <span className="shrink-0 font-medium text-gray-500 dark:text-gray-400">価格</span>
                    <span>{p.price}</span>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    価格
                  </label>
                  <input
                    type="text"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="例：¥9,800/月"
                    className={fieldClass}
                  />
                </div>
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
              </div>

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

              <div>
                <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  特徴・メリット（AIが投稿文に活用します）
                </label>
                <div className="space-y-2">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={f}
                        onChange={(e) => updateFeature(i, e.target.value)}
                        placeholder={`特徴 ${i + 1}`}
                        className={fieldClass}
                      />
                      {form.features.length > 1 && (
                        <button
                          onClick={() => removeFeature(i)}
                          className="shrink-0 rounded-lg border border-gray-300 px-2 text-xs text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addFeature}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    ＋ 特徴を追加
                  </button>
                </div>
              </div>

              {/* 製品画像 */}
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  製品画像（サムネイル）
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
