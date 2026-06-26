"use client";

import { useState } from "react";
import { useBrands } from "@/hooks/useBrands";
import { useAuth } from "@/hooks/useAuth";
import { createBrand, deleteBrand, updateBrand } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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
}

const defaultForm = (): FormState => ({
  name: "",
  threadsUserId: "",
  threadsAccessToken: "",
  description: "",
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
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !form.name.trim() || !form.threadsUserId || !form.threadsAccessToken) return;
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await updateBrand(editId, { ...form, userId: user.uid });
      } else {
        await createBrand({ ...form, userId: user.uid });
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ブランド設定
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Threads API の認証情報を設定します
          </p>
        </div>
        <Button onClick={openAdd} size="sm">
          + ブランドを追加
        </Button>
      </div>

      <div className="space-y-4">
        {brands.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
            <p className="text-gray-400 dark:text-gray-500">
              ブランドが設定されていません
            </p>
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {brand.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {brand.description}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Threads User ID: {brand.threadsUserId || "未設定"}
                </p>
                {profiles[brand.id] && (
                  <div className="mt-2 flex items-center gap-3 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50">
                    {profiles[brand.id].threads_profile_picture_url && (
                      <img src={profiles[brand.id].threads_profile_picture_url} alt="avatar"
                        className="h-10 w-10 rounded-full object-cover" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {profiles[brand.id].name}
                        <span className="ml-1 text-xs text-gray-500">@{profiles[brand.id].username}</span>
                      </p>
                      {profiles[brand.id].threads_biography && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{profiles[brand.id].threads_biography}</p>
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
              <div className="flex gap-2">
                <Button variant="secondary" size="sm"
                  onClick={() => fetchProfile(brand.id, brand.threadsUserId, brand.threadsAccessToken)}
                  loading={loadingProfile === brand.id}
                >
                  プロフィール
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openEdit(brand)}>
                  編集
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(brand.id)}>
                  削除
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800/50 dark:bg-blue-900/20">
          <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
            {editId ? "ブランドを編集" : "ブランドを追加"}
          </h3>

          <div className="space-y-4">
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

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                ブランド説明・AI生成への指示
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="例：建設業DXに特化したブランド。現場目線で力強く語る。ブランドメッセージは「建設業の未来を、現場から変える。」"
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                AI投稿生成時にこの説明をもとに文章を作成します
              </p>
            </div>

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

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving}>
                保存
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                キャンセル
              </Button>
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
