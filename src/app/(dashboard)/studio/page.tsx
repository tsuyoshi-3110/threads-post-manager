"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useBrands } from "@/hooks/useBrands";
import { createPost, updatePost } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ImageUploader } from "@/components/post/ImageUploader";
import { VideoUploader } from "@/components/post/VideoUploader";
import { Timestamp } from "firebase/firestore";

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

const SUGGESTIONS = [
  "もっと短く",
  "もっとカジュアルに",
  "もっとプロフェッショナルに",
  "別バージョンを作って",
  "ハッシュタグを変えて",
  "もっとインパクトを強く",
  "絵文字を減らして",
  "もっとユーモアを入れて",
];

export default function StudioPage() {
  const { user } = useAuth();
  const { brands, loading: brandsLoading } = useBrands();
  const router = useRouter();

  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [mediaType, setMediaType] = useState<"none" | "image" | "video">("none");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [scheduleModal, setScheduleModal] = useState<{ idx: number; content: string } | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [chatImageUrl, setChatImageUrl] = useState("");
  const [uploadingChatImage, setUploadingChatImage] = useState(false);
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const toLocalDateTimeString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const defaultScheduleTime = () => toLocalDateTimeString(new Date(Date.now() + 30 * 60 * 1000));

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const uploadChatImage = async (file: File) => {
    setUploadingChatImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setChatImageUrl(data.url);
    } catch {
      alert("画像のアップロードに失敗しました");
    } finally {
      setUploadingChatImage(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if ((!content && !chatImageUrl) || loading) return;
    setInput("");

    const userMessage: Message = { role: "user", content: content || "この画像を見て投稿文を作って", ...(chatImageUrl ? { imageUrl: chatImageUrl } : {}) };
    setChatImageUrl("");
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          brandName: selectedBrand?.name ?? "",
          brandDescription: selectedBrand?.description ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");
      setMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", content: `エラー: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const mediaPayload = () => ({
    imageUrl: mediaType === "image" && imageUrl ? imageUrl : null,
    videoUrl: mediaType === "video" && videoUrl ? videoUrl : null,
  });

  const saveDraft = async (content: string, idx: number) => {
    if (!user || !selectedBrandId) return;
    setSavingId(idx);
    try {
      await createPost({
        brandId: selectedBrandId,
        userId: user.uid,
        content,
        status: "draft",
        scheduledAt: null,
        publishedAt: null,
        threadsPostId: null,
        aiGenerated: true,
        aiPrompt: messages[0]?.content ?? null,
        ...mediaPayload(),
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "✅ 下書きに保存しました！投稿作成ページから確認できます。" },
      ]);
    } finally {
      setSavingId(null);
    }
  };

  const publishNow = async (content: string, idx: number) => {
    if (!user || !selectedBrandId || !selectedBrand) return;
    setPublishingId(idx);
    try {
      const postId = await createPost({
        brandId: selectedBrandId,
        userId: user.uid,
        content,
        status: "draft",
        scheduledAt: null,
        publishedAt: null,
        threadsPostId: null,
        aiGenerated: true,
        aiPrompt: messages[0]?.content ?? null,
        ...mediaPayload(),
      });

      const res = await fetch("/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          brandId: selectedBrandId,
          content,
          threadsUserId: selectedBrand.threadsUserId,
          threadsAccessToken: selectedBrand.threadsAccessToken,
          imageUrl: mediaType === "image" ? imageUrl || undefined : undefined,
          videoUrl: mediaType === "video" ? videoUrl || undefined : undefined,
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

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "🎉 Threads に投稿しました！" },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `投稿失敗: ${(e as Error).message}` },
      ]);
    } finally {
      setPublishingId(null);
    }
  };

  const startEdit = (idx: number, text: string) => {
    setEditingIdx(idx);
    setEditingText(text);
  };

  const confirmEdit = (idx: number) => {
    setMessages((prev) =>
      prev.map((msg, i) => {
        if (i !== idx) return msg;
        const postMatch = msg.content.match(/\[POST\]([\s\S]*?)\[\/POST\]/);
        const commentText = postMatch
          ? msg.content.replace(/\[POST\][\s\S]*?\[\/POST\]/, "").trim()
          : "";
        const newContent = commentText
          ? `${commentText}\n[POST]${editingText}[/POST]`
          : `[POST]${editingText}[/POST]`;
        return { ...msg, content: newContent };
      })
    );
    setEditingIdx(null);
  };

  const openScheduleModal = (content: string, idx: number) => {
    setScheduleDateTime(defaultScheduleTime());
    setScheduleModal({ idx, content });
  };

  const saveScheduled = async () => {
    if (!user || !selectedBrandId || !scheduleModal || !scheduleDateTime) return;
    try {
      await createPost({
        brandId: selectedBrandId,
        userId: user.uid,
        content: scheduleModal.content,
        status: "scheduled",
        scheduledAt: Timestamp.fromDate(new Date(scheduleDateTime)),
        publishedAt: null,
        threadsPostId: null,
        aiGenerated: true,
        aiPrompt: messages[0]?.content ?? null,
        ...mediaPayload(),
      });
      setScheduleModal(null);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `🕐 ${new Date(scheduleDateTime).toLocaleString("ja-JP")} に予約投稿を設定しました！` },
      ]);
    } catch {
      alert("予約設定に失敗しました");
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInput("");
  };

  if (brandsLoading) return <LoadingSpinner className="py-20" />;

  return (
    <div className="flex h-[calc(100dvh-14rem)] flex-col md:h-[calc(100vh-8rem)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            AI 投稿スタジオ
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            AI と対話しながら投稿を磨いていきましょう
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={resetChat}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            リセット
          </button>
        )}
      </div>

      {/* ブランド選択 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {brands.map((brand) => (
          <button
            key={brand.id}
            onClick={() => { setSelectedBrandId(brand.id); resetChat(); }}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              selectedBrandId === brand.id
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            }`}
          >
            {brand.name}
          </button>
        ))}
      </div>

      {/* チャットエリア */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="text-4xl">✨</div>
            <p className="mt-3 text-base font-medium text-gray-700 dark:text-gray-300">
              投稿のテーマやキーワードを入力してください
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              例：「新しいサービスのリリース告知」「暇つぶしについての一言」
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${msg.role === "user" ? "order-2" : "order-1"}`}>
                  {msg.role === "assistant" && (
                    <div className="mb-1 flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-xs text-white">AI</div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{selectedBrand?.name}</span>
                    </div>
                  )}
                  {(() => {
                    if (msg.role === "user") {
                      return (
                        <div className="rounded-2xl bg-blue-600 px-4 py-3 text-sm leading-relaxed text-white">
                          {msg.imageUrl && (
                            <img src={msg.imageUrl} alt="添付画像" className="mb-2 max-h-48 rounded-lg object-cover" />
                          )}
                          {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                        </div>
                      );
                    }

                    const postMatch = msg.content.match(/\[POST\]([\s\S]*?)\[\/POST\]/);
                    const postText = postMatch?.[1]?.trim() ?? null;
                    const commentText = postMatch
                      ? msg.content.replace(/\[POST\][\s\S]*?\[\/POST\]/, "").trim()
                      : msg.content.trim();

                    return (
                      <div className="space-y-2">
                        {/* 感想・コメント部分 */}
                        {commentText && (
                          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                            <p className="whitespace-pre-wrap">{commentText}</p>
                          </div>
                        )}

                        {/* 投稿文部分 */}
                        {postText && (
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-900/20">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">投稿案</p>
                              {editingIdx !== idx && (
                                <button
                                  onClick={() => startEdit(idx, postText)}
                                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                  ✏️ 編集
                                </button>
                              )}
                            </div>

                            {editingIdx === idx ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  rows={5}
                                  className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 focus:border-blue-500 focus:outline-none dark:border-blue-600 dark:bg-gray-800 dark:text-gray-100"
                                />
                                <p className="text-right text-xs text-gray-400">{editingText.length} 文字</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => confirmEdit(idx)}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                  >
                                    確定
                                  </button>
                                  <button
                                    onClick={() => setEditingIdx(null)}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100">{postText}</p>
                            )}

                            {/* メディア選択 */}
                            <div className="mt-3 border-t border-blue-100 pt-3 dark:border-blue-800/30">
                              <div className="flex gap-2">
                                {(["none", "image", "video"] as const).map((type) => (
                                  <button
                                    key={type}
                                    onClick={() => { setMediaType(type); setImageUrl(""); setVideoUrl(""); }}
                                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                                      mediaType === type
                                        ? "border-blue-500 bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                                        : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                    }`}
                                  >
                                    {type === "none" ? "テキストのみ" : type === "image" ? "🖼️ 画像" : "🎬 動画"}
                                  </button>
                                ))}
                              </div>
                              {mediaType === "image" && (
                                <div className="mt-2">
                                  <ImageUploader value={imageUrl} onChange={setImageUrl} onRemove={() => setImageUrl("")} />
                                </div>
                              )}
                              {mediaType === "video" && (
                                <div className="mt-2">
                                  <VideoUploader value={videoUrl} onChange={setVideoUrl} onRemove={() => setVideoUrl("")} />
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                onClick={() => saveDraft(editingIdx === idx ? editingText : postText, idx)}
                                disabled={savingId === idx}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 disabled:opacity-50"
                              >
                                {savingId === idx ? "保存中..." : "📝 下書き保存"}
                              </button>
                              <button
                                onClick={() => openScheduleModal(editingIdx === idx ? editingText : postText, idx)}
                                className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                              >
                                🕐 予約投稿
                              </button>
                              <button
                                onClick={() => publishNow(editingIdx === idx ? editingText : postText, idx)}
                                disabled={publishingId === idx}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {publishingId === idx ? "投稿中..." : "🚀 今すぐ投稿"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* クイック返信サジェスト */}
      {messages.length > 0 && !loading && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 予約投稿モーダル */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">予約投稿</h3>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{scheduleModal.content}</p>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              投稿日時
            </label>
            <input
              type="datetime-local"
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setScheduleModal(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={saveScheduled}
                disabled={!scheduleDateTime}
                className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                予約する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 入力エリア */}
      <div className="mt-2 space-y-2">
        {/* 画像プレビュー */}
        {chatImageUrl && (
          <div className="relative inline-block">
            <img src={chatImageUrl} alt="添付画像" className="h-24 rounded-lg border border-gray-300 object-cover dark:border-gray-600" />
            <button
              onClick={() => setChatImageUrl("")}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-xs text-white hover:bg-gray-900"
            >
              ×
            </button>
          </div>
        )}

        {uploadingChatImage && (
          <p className="text-xs text-gray-500">アップロード中...</p>
        )}

        <div className="flex gap-2">
          {/* 画像添付ボタン */}
          <input
            ref={chatImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadChatImage(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => chatImageInputRef.current?.click()}
            disabled={loading || !selectedBrandId || uploadingChatImage}
            title="画像を添付"
            className="flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            🖼️
          </button>

          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={messages.length === 0 ? "投稿のテーマ・キーワードを入力...（⌘+Enter で送信）" : "修正指示を入力...（⌘+Enter で送信）"}
            disabled={loading || !selectedBrandId}
            className="flex-1 resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <button
            onClick={() => sendMessage()}
            disabled={(!input.trim() && !chatImageUrl) || loading || !selectedBrandId}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
