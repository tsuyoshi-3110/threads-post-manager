"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  onRemove?: () => void;
}

export const ImageUploader = ({ value, onChange, label, onRemove }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("10MB 以下の画像を選択してください");
      return;
    }
    setError("");
    setUploading(true);
    setProgress(30);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      setProgress(90);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "アップロード失敗");

      setProgress(100);
      onChange(data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (value) {
    return (
      <div className="relative inline-block">
        {label && <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>}
        <div className="group relative">
          <img src={value} alt="アップロード済み" className="max-h-48 rounded-xl object-cover ring-2 ring-blue-400" />
          <button
            onClick={onRemove ?? (() => onChange(""))}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : uploading
            ? "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50"
            : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-500"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">アップロード中...</p>
          </div>
        ) : (
          <>
            <div className="mb-2 text-3xl">{dragging ? "📂" : "🖼️"}</div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {dragging ? "ここにドロップ" : "クリックまたはドラッグ＆ドロップ"}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">JPG / PNG / GIF / WebP（10MB 以下）</p>
          </>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
    </div>
  );
};
