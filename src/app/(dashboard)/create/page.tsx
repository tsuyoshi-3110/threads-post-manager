"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useBrands } from "@/hooks/useBrands";
import { useProducts } from "@/hooks/useProducts";
import { createPost, updatePost } from "@/lib/firebase/firestore";
import { AiGenerateForm } from "@/components/post/AiGenerateForm";
import { ImageUploader } from "@/components/post/ImageUploader";
import { VideoUploader } from "@/components/post/VideoUploader";
import { Button } from "@/components/ui/Button";
import { Timestamp } from "firebase/firestore";
import { PostPurpose } from "@/types";

const MAX_CHARS = 500;

export default function CreatePage() {
  const { user } = useAuth();
  const { brands, loading: brandsLoading } = useBrands();
  const { products } = useProducts();
  const router = useRouter();

  const [content, setContent] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [images, setImages] = useState<string[]>([""]);
  const [videoUrl, setVideoUrl] = useState("");
  const [mediaType, setMediaType] = useState<"text" | "image" | "video">("text");
  const [postPurpose, setPostPurpose] = useState<PostPurpose | "">("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const charsLeft = MAX_CHARS - content.length;
  const validImages = images.filter(Boolean);

  const purposePayload = () => ({
    postPurpose: postPurpose || null,
    productId: selectedProductId || null,
  });

  const mediaPayload = () => {
    if (mediaType === "image") {
      return {
        imageUrl: validImages.length === 1 ? validImages[0] : null,
        imageUrls: validImages.length > 1 ? validImages : null,
        videoUrl: null,
      };
    }
    if (mediaType === "video") {
      return { imageUrl: null, imageUrls: null, videoUrl: videoUrl || null };
    }
    return { imageUrl: null, imageUrls: null, videoUrl: null };
  };

  const saveDraft = async () => {
    if (!user || !selectedBrandId || !content.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createPost({
        brandId: selectedBrandId,
        userId: user.uid,
        content,
        status: "draft",
        scheduledAt: null,
        publishedAt: null,
        threadsPostId: null,
        ...mediaPayload(),
        ...purposePayload(),
        aiGenerated: false,
        aiPrompt: null,
      });
      setSuccess("下書きに保存しました");
      setTimeout(() => router.push("/drafts"), 1000);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const saveScheduled = async () => {
    if (!user || !selectedBrandId || !content.trim() || !scheduledAt) return;
    setSaving(true);
    setError("");
    try {
      const ts = Timestamp.fromDate(new Date(scheduledAt));
      await createPost({
        brandId: selectedBrandId,
        userId: user.uid,
        content,
        status: "scheduled",
        scheduledAt: ts,
        publishedAt: null,
        threadsPostId: null,
        ...mediaPayload(),
        ...purposePayload(),
        aiGenerated: false,
        aiPrompt: null,
      });
      setSuccess("予約投稿を設定しました");
      setTimeout(() => router.push("/scheduled"), 1000);
    } catch {
      setError("予約設定に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async () => {
    if (!user || !selectedBrandId || !content.trim()) return;
    setPublishing(true);
    setError("");
    try {
      const payload = mediaPayload();
      const postId = await createPost({
        brandId: selectedBrandId,
        userId: user.uid,
        content,
        status: "draft",
        scheduledAt: null,
        publishedAt: null,
        threadsPostId: null,
        ...payload,
        ...purposePayload(),
        aiGenerated: false,
        aiPrompt: null,
      });

      const res = await fetch("/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          brandId: selectedBrandId,
          content,
          threadsUserId: selectedBrand!.threadsUserId,
          threadsAccessToken: selectedBrand!.threadsAccessToken,
          imageUrl: payload.imageUrl ?? undefined,
          imageUrls: payload.imageUrls ?? undefined,
          videoUrl: payload.videoUrl ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "投稿に失敗しました");
      }

      const { threadsPostId } = await res.json();
      await updatePost(postId, {
        status: "published",
        publishedAt: Timestamp.now(),
        threadsPostId,
      });

      setSuccess("投稿しました！");
      setTimeout(() => router.push("/history"), 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  const updateImage = (idx: number, url: string) => {
    const next = [...images];
    next[idx] = url;
    setImages(next);
  };

  const removeImage = (idx: number) => {
    if (images.length === 1) {
      setImages([""]);
    } else {
      setImages(images.filter((_, i) => i !== idx));
    }
  };

  if (brandsLoading)
    return <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>;

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
        投稿作成
      </h2>

      {brands.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            投稿するにはまずブランドを設定してください
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => router.push("/brands")}>
            ブランド設定へ
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ブランド選択 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              投稿ブランド
            </label>
            <div className="flex flex-wrap gap-2">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => setSelectedBrandId(brand.id)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    selectedBrandId === brand.id
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          </div>

          {/* 投稿目的・製品選択 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              投稿目的
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: "", label: "日常投稿" },
                { value: "promotion", label: "📣 商品紹介" },
                { value: "soft", label: "💡 ソフト誘導" },
              ] as { value: PostPurpose | ""; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setPostPurpose(opt.value); if (!opt.value) setSelectedProductId(""); }}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    postPurpose === opt.value
                      ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {(postPurpose === "promotion" || postPurpose === "soft") && (
              <div className="mt-2">
                {products.length === 0 ? (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    製品が登録されていません。
                    <button onClick={() => router.push("/products")} className="ml-1 underline">製品管理で追加</button>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id === selectedProductId ? "" : p.id)}
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
                )}
                {selectedProduct && (
                  <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-300">
                    <span className="font-medium">{selectedProduct.name}</span> — {selectedProduct.tagline}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI生成フォーム */}
          {selectedBrand && (
            <AiGenerateForm
              brandName={selectedBrand.name}
              brandDescription={selectedBrand.description}
              onGenerated={(text) => setContent(text)}
            />
          )}

          {/* メディアタイプ選択 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              投稿タイプ
            </label>
            <div className="flex gap-2">
              {(["text", "image", "video"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMediaType(type)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    mediaType === type
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {type === "text" ? "テキスト" : type === "image" ? "画像" : "動画"}
                </button>
              ))}
            </div>

            {mediaType === "video" && (
              <div className="mt-3">
                <VideoUploader value={videoUrl} onChange={setVideoUrl} onRemove={() => setVideoUrl("")} />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  ※ 動画は Threads での処理に最大90秒かかります
                </p>
              </div>
            )}

            {mediaType === "image" && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  最大10枚まで追加できます（複数枚でカルーセル投稿になります）
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((url, i) => (
                    <ImageUploader
                      key={i}
                      value={url}
                      onChange={(newUrl) => updateImage(i, newUrl)}
                      label={images.length > 1 ? `画像 ${i + 1}` : undefined}
                      onRemove={() => removeImage(i)}
                    />
                  ))}
                  {images.length < 10 && (
                    <button
                      onClick={() => setImages([...images, ""])}
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-8 text-sm text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      <span className="text-2xl">+</span>
                      <span className="mt-1 text-xs">画像を追加</span>
                    </button>
                  )}
                </div>
                {validImages.length > 1 && (
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    📋 {validImages.length} 枚選択中 → カルーセル投稿
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 投稿文 */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                投稿文
              </label>
              <span className={`text-xs ${charsLeft < 0 ? "text-red-500" : "text-gray-400 dark:text-gray-500"}`}>
                {charsLeft} 文字残り
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="投稿文を入力するか、AIで生成してください"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          {/* 予約日時 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              予約投稿日時（任意）
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={(() => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600 dark:bg-green-900/30 dark:text-green-400">
              {success}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={saveDraft}
              loading={saving}
              disabled={!selectedBrandId || !content.trim() || charsLeft < 0}
            >
              下書き保存
            </Button>

            {scheduledAt && (
              <Button
                variant="secondary"
                onClick={saveScheduled}
                loading={saving}
                disabled={!selectedBrandId || !content.trim() || charsLeft < 0}
              >
                予約投稿を設定
              </Button>
            )}

            <Button
              onClick={publishNow}
              loading={publishing}
              disabled={
                !selectedBrandId || !content.trim() || charsLeft < 0 ||
                (mediaType === "image" && validImages.length === 0) ||
                (mediaType === "video" && !videoUrl)
              }
            >
              今すぐ投稿
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
