"use client";

import { useState } from "react";
import { useBrands } from "@/hooks/useBrands";
import { useAuth } from "@/hooks/useAuth";
import { createBrand, deleteBrand, updateBrand } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ImageUploader } from "@/components/post/ImageUploader";

interface ThreadsProfile {
  username?: string;
  name?: string;
  threads_biography?: string;
  threads_profile_picture_url?: string;
  followers_count?: number;
}

interface FormState {
  name: string;
  threadsUserId: string;
  threadsAccessToken: string;
  description: string;
  characterDescription: string;
  characterImageUrls: string[];
}

const defaultForm = (): FormState => ({
  name: "",
  threadsUserId: "",
  threadsAccessToken: "",
  description: "",
  characterDescription: "",
  characterImageUrls: [],
});

const fieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

export default function BrandsPage() {
  const { user } = useAuth();
  const { brands, loading, refetch } = useBrands();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<Record<string, ThreadsProfile>>({});
  const [loadingProfile, setLoadingProfile] = useState<string | null>(null);

  const fetchProfile = async (brandId: string, threadsUserId: string, accessToken: string) => {
    if (profiles[brandId]) return;
    setLoadingProfile(brandId);
    try {
      const params = new URLSearchParams({ threadsUserId, accessToken });
      const res = await fetch(`/api/threads/profile?${params}`);
      const data = await res.json();
      if (res.ok) setProfiles((prev) => ({ ...prev, [brandId]: data }));
    } finally {
      setLoadingProfile(null);
    }
  };

  const openAdd = () => {
    setEditId(null);
    setForm(defaultForm());
    setShowForm(true);
  };

  const openEdit = (brand: (typeof brands)[0]) => {
    setEditId(brand.id);
    setForm({
      name: brand.name as string,
      threadsUserId: brand.threadsUserId,
      threadsAccessToken: brand.threadsAccessToken,
      description: brand.description,
      characterDescription: brand.characterDescription ?? "",
      characterImageUrls: brand.characterImageUrls ?? [],
    });
    setShowForm(true);
  };

  const addCharacterImage = (url: string) => {
    if (!url || form.characterImageUrls.includes(url)) return;
    setForm((f) => ({ ...f, characterImageUrls: [...f.characterImageUrls, url] }));
  };

  const removeCharacterImage = (index: number) => {
    setForm((f) => ({
      ...f,
      characterImageUrls: f.characterImageUrls.filter((_, i) => i !== index),
    }));
  };

  const addThreadsIcon = () => {
    const url = editId ? profiles[editId]?.threads_profile_picture_url : undefined;
    if (url) addCharacterImage(url);
  };

  const handleSave = async () => {
    if (!user || !form.name.trim() || !form.threadsUserId || !form.threadsAccessToken) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        characterDescription: form.characterDescription,
        characterImageUrls: form.characterImageUrls,
        threadsUserId: form.threadsUserId,
        threadsAccessToken: form.threadsAccessToken,
        userId: user.uid,
      };
      if (editId) {
        await updateBrand(editId, payload);
      } else {
        await createBrand(payload);
      }
      await refetch();
      setShowForm(false);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このブランドを削除しますか？")) return;
    await deleteBrand(id);
    await refetch();
  };

  if (loading) return <LoadingSpinner className="py-20" />;

  const threadsIconUrl = editId ? profiles[editId]?.threads_profile_picture_url : undefined;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ブランド設定</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Threads API の認証情報を設定します
          </p>
        </div>
        <Button onClick={openAdd} size="sm">+ ブランドを追加</Button>
      </div>

      {/* ブランド一覧 */}
      <div className="space-y-4">
        {brands.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
            <p className="text-gray-400 dark:text-gray-500">ブランドが設定されていません</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={openAdd}>
              最初のブランドを追加
            </Button>
          </div>
        )}

        {brands.map((brand) => (
          <div
            key={brand.id}
            className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {/* キャラクター画像サムネイル（最大3枚） */}
                  {(brand.characterImageUrls ?? []).slice(0, 3).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`キャラクター${i + 1}`}
                      className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-blue-300 dark:ring-blue-700"
                      style={{ marginLeft: i > 0 ? "-8px" : 0, zIndex: 3 - i }}
                    />
                  ))}
                  {(brand.characterImageUrls?.length ?? 0) > 3 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{(brand.characterImageUrls?.length ?? 0) - 3}
                    </span>
                  )}
                  <div className={(brand.characterImageUrls?.length ?? 0) > 0 ? "ml-1" : ""}>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {brand.name}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Threads User ID: {brand.threadsUserId || "未設定"}
                    </p>
                  </div>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                  {brand.description}
                </p>
                {profiles[brand.id] && (
                  <div className="mt-2 flex items-center gap-3 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50">
                    {profiles[brand.id].threads_profile_picture_url && (
                      <img
                        src={profiles[brand.id].threads_profile_picture_url}
                        alt="avatar"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {profiles[brand.id].name}
                        <span className="ml-1 text-xs text-gray-500">@{profiles[brand.id].username}</span>
                      </p>
                      {profiles[brand.id].threads_biography && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {profiles[brand.id].threads_biography}
                        </p>
                      )}
                      {profiles[brand.id].followers_count !== undefined && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          フォロワー {profiles[brand.id].followers_count?.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchProfile(brand.id, brand.threadsUserId, brand.threadsAccessToken)}
                  loading={loadingProfile === brand.id}
                >
                  プロフィール
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openEdit(brand)}>編集</Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(brand.id)}>削除</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* フォーム */}
      {showForm && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800/50 dark:bg-blue-900/20">
          <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
            {editId ? "ブランドを編集" : "ブランドを追加"}
          </h3>

          <div className="space-y-4">
            {/* ブランド名 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                ブランド名
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例: 孤高の暇人"
                className={fieldClass}
              />
            </div>

            {/* ブランド説明 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                ブランド説明・AI生成への指示
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="例：建設業DXに特化したブランド。現場目線で力強く語る。"
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                AI投稿生成時にこの説明をもとに文章を作成します
              </p>
            </div>

            {/* キャラクター説明 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                ブランドキャラクター説明
              </label>
              <textarea
                value={form.characterDescription}
                onChange={(e) => setForm({ ...form, characterDescription: e.target.value })}
                rows={3}
                placeholder="例：黒髪ショートの元気な女の子。緑のパーカーを着ていて笑顔が印象的。"
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                「書風画像」ページでこの説明をもとにAIがキャラクターを生成します
              </p>
            </div>

            {/* キャラクター画像（複数） */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                キャラクター画像
                <span className="ml-2 text-xs font-normal text-gray-400">
                  （{form.characterImageUrls.length}枚登録済み）
                </span>
              </label>

              {/* Threadsアイコンを追加ボタン */}
              {threadsIconUrl && !form.characterImageUrls.includes(threadsIconUrl) && (
                <button
                  type="button"
                  onClick={addThreadsIcon}
                  className="mb-3 flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <img src={threadsIconUrl} alt="Threadsアイコン" className="h-5 w-5 rounded-full object-cover" />
                  Threads のアイコンを追加
                </button>
              )}

              {/* 登録済み画像グリッド */}
              {form.characterImageUrls.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {form.characterImageUrls.map((url, i) => (
                    <div key={i} className="group relative">
                      <img
                        src={url}
                        alt={`キャラクター${i + 1}`}
                        className="h-20 w-20 rounded-xl object-cover ring-2 ring-gray-200 dark:ring-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => removeCharacterImage(i)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                      >
                        ✕
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-xs text-white">
                          メイン
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 新規追加アップローダー */}
              <ImageUploader
                value=""
                onChange={(url) => { if (url) addCharacterImage(url); }}
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                複数枚登録可能。1枚目が書風画像の隅に使われます。
              </p>
            </div>

            {/* Threads User ID */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Threads User ID
              </label>
              <input
                type="text"
                value={form.threadsUserId}
                onChange={(e) => setForm({ ...form, threadsUserId: e.target.value })}
                placeholder="例: 1234567890"
                className={fieldClass}
              />
            </div>

            {/* Access Token */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Threads Access Token
              </label>
              <input
                type="password"
                value={form.threadsAccessToken}
                onChange={(e) => setForm({ ...form, threadsAccessToken: e.target.value })}
                placeholder="Threads API のアクセストークン"
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Meta for Developers で取得したアクセストークンを入力してください
              </p>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving}>保存</Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>キャンセル</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Threads API セットアップ手順
        </h3>
        <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>1. Meta for Developers (developers.facebook.com) でアプリを作成</li>
          <li>2. 「Threads API」プロダクトを追加</li>
          <li>3. テストユーザーを追加してアクセストークンを発行</li>
          <li>4. User ID とアクセストークンをここに入力</li>
        </ol>
      </div>
    </div>
  );
}
