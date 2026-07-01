"use client";

import { useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { useBrands } from "@/hooks/useBrands";
import { useAuth } from "@/hooks/useAuth";
import { updateBrand, createPost } from "@/lib/firebase/firestore";

const THEMES = [
  { value: "人生・哲学",   emoji: "💭" },
  { value: "仕事・努力",   emoji: "💪" },
  { value: "人間関係",     emoji: "🤝" },
  { value: "自由・解放",   emoji: "🕊️" },
  { value: "笑い・ユーモア", emoji: "😄" },
  { value: "お金・成功",   emoji: "💰" },
  { value: "孤独・内省",   emoji: "🌙" },
  { value: "変化・挑戦",   emoji: "🔥" },
];

const CALLIGRAPHY_STYLES = [
  { value: "motivational", label: "🍀 動機づけ", desc: "温かみある和紙スタイル" },
  { value: "traditional",  label: "🖋️ 伝統書道",  desc: "白い和紙に力強い筆文字" },
  { value: "modern",       label: "✨ モダン",     desc: "墨スプラッシュの仕上がり" },
];

const CHAR_STYLES = [
  { value: "anime", label: "🎌 アニメ",    desc: "詳細なアニメイラスト" },
  { value: "chibi", label: "🐣 ちびキャラ", desc: "かわいいデフォルメ系" },
  { value: "yuru",  label: "🧸 ゆるキャラ", desc: "ゆるくて親しみやすい" },
];

async function uploadBase64(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], "calligraphy.png", { type: "image/png" });
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "アップロード失敗");
  return data.url as string;
}

export default function CalligraphyPage() {
  const { user } = useAuth();
  const { brands, refetch } = useBrands();
  const [tab, setTab] = useState<"calligraphy" | "character">("calligraphy");

  /* ─── 書風画像 ─── */
  const [text, setText] = useState("");
  const [callStyle, setCallStyle] = useState("motivational");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [callImage, setCallImage] = useState<string | null>(null);
  const [callError, setCallError] = useState("");

  /* ─── メッセージAI生成 ─── */
  const [theme, setTheme] = useState("");
  const [genMessage, setGenMessage] = useState(false);

  /* ─── 投稿パネル ─── */
  const [postContent, setPostContent] = useState("");
  const [postBrandId, setPostBrandId] = useState("");
  const [genContent, setGenContent] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("20:00");
  const [posting, setPosting] = useState<"" | "publish" | "draft" | "schedule">("");
  const [postDone, setPostDone] = useState<"" | "published" | "drafted" | "scheduled">("");
  const [postError, setPostError] = useState("");

  /* ─── キャラクター ─── */
  const [charBrandId, setCharBrandId] = useState("");
  const [charDescription, setCharDescription] = useState("");
  const [charStyle, setCharStyle] = useState("anime");
  const [genChar, setGenChar] = useState(false);
  const [charImage, setCharImage] = useState<string | null>(null);
  const [charError, setCharError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ブランドが1つだけなら自動選択
  useEffect(() => {
    if (brands.length === 1 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id);
      setPostBrandId(brands[0].id);
    }
  }, [brands]);

  // 書風画像用ブランドを投稿用にも同期
  useEffect(() => {
    if (selectedBrandId) setPostBrandId(selectedBrandId);
  }, [selectedBrandId]);

  /* ─── 書風画像生成 ─── */
  const handleGenCalligraphy = async () => {
    if (!text.trim() || generating) return;
    setGenerating(true);
    setCallError("");
    setCallImage(null);
    setPostDone("");
    setPostContent("");

    const brand = brands.find((b) => b.id === selectedBrandId);
    const characterImageUrls = (brand?.characterImageUrls ?? []).length > 0
      ? brand!.characterImageUrls
      : undefined;
    const characterDescription = brand?.characterDescription ?? undefined;

    try {
      const res = await fetch("/api/ai/calligraphy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), style: callStyle, characterDescription, characterImageUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成に失敗しました");
      setCallImage(data.imageData);
    } catch (e) {
      setCallError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  /* ─── 言葉・メッセージAI生成 ─── */
  const handleGenMessage = async () => {
    if (genMessage) return;
    setGenMessage(true);
    const brand = brands.find((b) => b.id === selectedBrandId);
    try {
      const res = await fetch("/api/ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brand ? { name: brand.name, description: brand.description } : null,
          theme,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失敗");
      setText(data.message ?? "");
    } catch (e) {
      setCallError(e instanceof Error ? e.message : "生成エラー");
    } finally {
      setGenMessage(false);
    }
  };

  /* ─── 投稿文AI生成 ─── */
  const handleGenContent = async () => {
    if (genContent) return;
    setGenContent(true);
    const brand = brands.find((b) => b.id === postBrandId);
    try {
      const res = await fetch("/api/ai/generate-from-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: { name: brand?.name ?? "", description: brand?.description ?? "" },
          product: null,
          purpose: "daily",
          ideaTitle: text,
          ideaDescription: "書道アート風の画像に合わせた投稿文",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失敗");
      setPostContent(data.content ?? "");
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "生成エラー");
    } finally {
      setGenContent(false);
    }
  };

  /* ─── 投稿アクション共通処理 ─── */
  const handlePostAction = async (action: "publish" | "draft" | "schedule") => {
    if (!callImage || !user || !postBrandId) return;
    setPosting(action);
    setPostError("");
    try {
      // base64 なら Firebase Storage にアップロード
      const imageUrl = callImage.startsWith("data:") ? await uploadBase64(callImage) : callImage;

      const brand = brands.find((b) => b.id === postBrandId);
      if (!brand) throw new Error("ブランドが見つかりません");

      if (action === "publish") {
        // Threads に即時投稿
        const pubRes = await fetch("/api/threads/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: postContent,
            brandId: postBrandId,
            threadsUserId: brand.threadsUserId,
            threadsAccessToken: brand.threadsAccessToken,
            imageUrl,
          }),
        });
        const pubData = await pubRes.json();
        if (!pubRes.ok) throw new Error(pubData.error || "投稿に失敗しました");

        await createPost({
          brandId: postBrandId,
          userId: user.uid,
          content: postContent,
          status: "published",
          scheduledAt: null,
          publishedAt: Timestamp.now(),
          threadsPostId: pubData.threadsPostId ?? null,
          imageUrl,
          imageUrls: null,
          videoUrl: null,
          aiGenerated: true,
          aiPrompt: text,
          postPurpose: "daily",
          productId: null,
        });
        setPostDone("published");

      } else if (action === "draft") {
        await createPost({
          brandId: postBrandId,
          userId: user.uid,
          content: postContent,
          status: "draft",
          scheduledAt: null,
          publishedAt: null,
          threadsPostId: null,
          imageUrl,
          imageUrls: null,
          videoUrl: null,
          aiGenerated: true,
          aiPrompt: text,
          postPurpose: "daily",
          productId: null,
        });
        setPostDone("drafted");

      } else {
        // 予約投稿
        if (!schedDate) throw new Error("日付を選択してください");
        const dt = new Date(`${schedDate}T${schedTime}:00`);
        if (isNaN(dt.getTime())) throw new Error("日時が無効です");

        await createPost({
          brandId: postBrandId,
          userId: user.uid,
          content: postContent,
          status: "scheduled",
          scheduledAt: Timestamp.fromDate(dt),
          publishedAt: null,
          threadsPostId: null,
          imageUrl,
          imageUrls: null,
          videoUrl: null,
          aiGenerated: true,
          aiPrompt: text,
          postPurpose: "daily",
          productId: null,
        });
        setPostDone("scheduled");
      }
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setPosting("");
    }
  };

  /* ─── キャラクター ─── */
  const handleCharBrandChange = (brandId: string) => {
    setCharBrandId(brandId);
    const brand = brands.find((b) => b.id === brandId);
    if (brand?.characterDescription) setCharDescription(brand.characterDescription);
    setSaved(false);
    setCharImage(null);
  };

  const handleGenCharacter = async () => {
    if (!charDescription.trim() || genChar) return;
    setGenChar(true);
    setCharError("");
    setCharImage(null);
    setSaved(false);
    try {
      const res = await fetch("/api/ai/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterDescription: charDescription.trim(), charStyle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成に失敗しました");
      setCharImage(data.imageData);
    } catch (e) {
      setCharError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setGenChar(false);
    }
  };

  const handleAddToBookmark = async () => {
    if (!charBrandId || !charImage) return;
    setSaving(true);
    setCharError("");
    try {
      let imageUrl = charImage;
      if (charImage.startsWith("data:")) {
        const blob = await (await fetch(charImage)).blob();
        const file = new File([blob], "character.png", { type: "image/png" });
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error ?? "アップロード失敗");
        imageUrl = uploadData.url;
      }
      const brand = brands.find((b) => b.id === charBrandId);
      const current = brand?.characterImageUrls ?? [];
      if (!current.includes(imageUrl)) {
        await updateBrand(charBrandId, {
          characterImageUrls: [...current, imageUrl],
          characterDescription: charDescription.trim(),
        });
        await refetch();
      }
      setSaved(true);
    } catch (e) {
      setCharError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = async (brandId: string, url: string) => {
    const brand = brands.find((b) => b.id === brandId);
    if (!brand) return;
    await updateBrand(brandId, { characterImageUrls: (brand.characterImageUrls ?? []).filter((u) => u !== url) });
    await refetch();
  };

  const selectClass =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-lg mx-auto pb-20">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">書風画像</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          言葉を書に変換、またはブランドキャラクターを生成します
        </p>
      </div>

      {/* タブ */}
      <div className="mb-6 flex rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
        {[
          { key: "calligraphy", label: "🖌️ 書風画像" },
          { key: "character",   label: "🧑‍🎨 キャラクター" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── 書風画像タブ ─── */}
      {tab === "calligraphy" && (
        <div className="space-y-5">
          {/* ブランド */}
          {brands.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                ブランド（キャラクターを使う場合）
              </label>
              <select value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)} className={selectClass}>
                <option value="">なし</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{(b.characterImageUrls?.length ?? 0) > 0 ? ` （画像 ${b.characterImageUrls!.length}枚）` : b.characterDescription ? " （説明あり）" : ""}
                  </option>
                ))}
              </select>
              {selectedBrandId && (() => {
                const b = brands.find((b) => b.id === selectedBrandId);
                const imgs = b?.characterImageUrls ?? [];
                if (!imgs.length && !b?.characterDescription) return null;
                return (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 dark:bg-blue-900/20">
                    {imgs.slice(0, 3).map((url, i) => (
                      <img key={i} src={url} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-blue-300" />
                    ))}
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      ✓ このブランドのキャラクターが画像の隅に描かれます
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* テーマ選択 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              テーマ <span className="ml-1 text-xs font-normal text-gray-400">（AI生成のヒント）</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(theme === t.value ? "" : t.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    theme === t.value
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-300 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {t.emoji} {t.value}
                </button>
              ))}
            </div>
          </div>

          {/* 言葉・メッセージ */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">言葉・メッセージ</label>
              <button
                onClick={handleGenMessage}
                disabled={genMessage}
                className="flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              >
                {genMessage ? "⏳ 生成中..." : "✨ AIが言葉を生成"}
              </button>
            </div>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="例：心を壊してまでやるべき仕事なんてない。"
              className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{text.length}文字</p>
          </div>

          {/* スタイル */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">スタイル</label>
            <div className="grid grid-cols-3 gap-2">
              {CALLIGRAPHY_STYLES.map((s) => (
                <button key={s.value} type="button" onClick={() => setCallStyle(s.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${callStyle === s.value ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30" : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800"}`}>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.label}</div>
                  <div className="mt-0.5 text-xs leading-tight text-gray-500 dark:text-gray-400">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenCalligraphy} loading={generating} disabled={!text.trim() || generating} className="w-full">
            🖌️ 書風画像を生成
          </Button>

          {generating && (
            <div className="mt-6 text-center">
              <div className="text-4xl animate-pulse">🖌️</div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">生成中...（約20〜40秒）</p>
            </div>
          )}

          {callError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{callError}</div>
          )}

          {callImage && (
            <div className="space-y-4">
              <img src={callImage} alt="書風画像" className="w-full rounded-2xl shadow-xl" />

              <div className="grid grid-cols-2 gap-3">
                <a href={callImage} download="calligraphy.png" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  ⬇️ 保存
                </a>
                <Button onClick={handleGenCalligraphy} variant="secondary" disabled={generating}>🔄 再生成</Button>
              </div>

              {/* ─── 投稿パネル ─── */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">✏️ この画像で投稿する</h3>

                {/* 投稿用ブランド選択 */}
                {brands.length > 1 && (
                  <div className="mb-4">
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">投稿先ブランド</label>
                    <select value={postBrandId} onChange={(e) => setPostBrandId(e.target.value)} className={selectClass}>
                      <option value="">選択...</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}

                {/* 投稿文 */}
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">投稿文</label>
                    <button
                      onClick={handleGenContent}
                      disabled={genContent || !text.trim()}
                      className="flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {genContent ? "⏳ 生成中..." : "✨ AI生成"}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="投稿文を入力、またはAI生成ボタンを押してください"
                    className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <p className="mt-0.5 text-right text-xs text-gray-400">{postContent.length}文字</p>
                </div>

                {/* 予約日時（折りたたみ） */}
                <button
                  onClick={() => setShowScheduler(!showScheduler)}
                  className="mb-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  🕐 {showScheduler ? "予約日時を閉じる" : "予約日時を設定する"}
                </button>
                {showScheduler && (
                  <div className="mb-4 flex gap-2">
                    <input type="date" value={schedDate} min={todayStr}
                      onChange={(e) => setSchedDate(e.target.value)}
                      className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                    <input type="time" value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="w-28 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                )}

                {/* エラー */}
                {postError && (
                  <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{postError}</div>
                )}

                {/* 成功メッセージ */}
                {postDone && (
                  <div className="mb-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    {postDone === "published" && "✅ Threadsに投稿しました"}
                    {postDone === "drafted" && "✅ 下書きに保存しました"}
                    {postDone === "scheduled" && "✅ 予約投稿に追加しました"}
                  </div>
                )}

                {/* アクションボタン */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => handlePostAction("publish")}
                    loading={posting === "publish"}
                    disabled={!!posting || !postBrandId || !postContent.trim() || !!postDone}
                    className="text-xs"
                  >
                    今すぐ投稿
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handlePostAction("draft")}
                    loading={posting === "draft"}
                    disabled={!!posting || !postBrandId || !!postDone}
                    className="text-xs"
                  >
                    下書き保存
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => { setShowScheduler(true); handlePostAction("schedule"); }}
                    loading={posting === "schedule"}
                    disabled={!!posting || !postBrandId || !schedDate || !!postDone}
                    className="text-xs"
                  >
                    予約投稿
                  </Button>
                </div>
                <p className="mt-2 text-center text-xs text-gray-400">
                  「今すぐ投稿」「下書き」は投稿文なしでも実行できます
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── キャラクタータブ ─── */}
      {tab === "character" && (
        <div className="space-y-5">
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            ブランドを選ぶと説明が自動入力されます。生成後にブランドへ追加登録できます。
          </div>

          {brands.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">ブランド</label>
              <select value={charBrandId} onChange={(e) => handleCharBrandChange(e.target.value)} className={selectClass}>
                <option value="">ブランドを選択...</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              {charBrandId && (() => {
                const b = brands.find((b) => b.id === charBrandId);
                const imgs = b?.characterImageUrls ?? [];
                if (!imgs.length) return null;
                return (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">登録済み画像（{imgs.length}枚）</p>
                    <div className="flex flex-wrap gap-2">
                      {imgs.map((url, i) => (
                        <div key={i} className="group relative">
                          <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover ring-2 ring-gray-200 dark:ring-gray-700" />
                          {i === 0 && <span className="absolute bottom-0.5 left-0.5 rounded bg-blue-500 px-1 text-xs text-white">メイン</span>}
                          <button onClick={() => handleRemoveImage(charBrandId, url)}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 shadow group-hover:opacity-100">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">キャラクターの説明</label>
            <textarea rows={4} value={charDescription} onChange={(e) => { setCharDescription(e.target.value); setSaved(false); }}
              placeholder="例：黒髪ショートの元気な女の子。緑のパーカーを着ていて笑顔が印象的。"
              className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">スタイル</label>
            <div className="grid grid-cols-3 gap-2">
              {CHAR_STYLES.map((s) => (
                <button key={s.value} type="button" onClick={() => setCharStyle(s.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${charStyle === s.value ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30" : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800"}`}>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.label}</div>
                  <div className="mt-0.5 text-xs leading-tight text-gray-500 dark:text-gray-400">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenCharacter} loading={genChar} disabled={!charDescription.trim() || genChar} className="w-full">
            🧑‍🎨 キャラクターを生成
          </Button>

          {genChar && (
            <div className="mt-4 text-center">
              <div className="text-4xl animate-pulse">🎨</div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">生成中...（約20〜40秒）</p>
            </div>
          )}

          {charError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{charError}</div>
          )}

          {charImage && (
            <div>
              <img src={charImage} alt="生成されたキャラクター" className="w-full rounded-2xl shadow-xl" />
              <div className="mt-4 space-y-3">
                {charBrandId && (
                  <Button onClick={handleAddToBookmark} loading={saving} disabled={saving || saved} className="w-full">
                    {saved ? "✅ ブランドに追加済み" : "➕ ブランドの画像コレクションに追加"}
                  </Button>
                )}
                {saved && <p className="text-center text-sm text-green-600 dark:text-green-400">追加しました。書風画像タブで使えます。</p>}
                <div className="grid grid-cols-2 gap-3">
                  <a href={charImage} download="character.png" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    ⬇️ 保存する
                  </a>
                  <Button onClick={handleGenCharacter} variant="secondary" disabled={genChar}>🔄 再生成</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
