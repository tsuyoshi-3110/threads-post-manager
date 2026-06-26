"use client";

import { useRef, useState, useCallback } from "react";
import { uploadImage } from "@/lib/firebase/storage";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  value: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
}

export const VideoUploader = ({ value, onChange, onRemove }: Props) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback(async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("video/")) {
      setError("動画ファイルを選択してください（MP4, MOV など）");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError("500MB 以下の動画を選択してください");
      return;
    }
    setError("");
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadImage(file, user.uid, setProgress);
      onChange(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }, [user, onChange]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (value) {
    return (
      <div className="group relative">
        <video
          src={value}
          controls
          className="max-h-64 w-full rounded-xl object-cover ring-2 ring-blue-400"
        />
        <button
          onClick={onRemove ?? (() => onChange(""))}
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div>
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
          <div className="flex w-full max-w-xs flex-col items-center gap-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              アップロード中... {progress}%
            </p>
          </div>
        ) : (
          <>
            <div className="mb-2 text-3xl">{dragging ? "📂" : "🎬"}</div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {dragging ? "ここにドロップ" : "クリックまたはドラッグ＆ドロップ"}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              MP4 / MOV / WebM（500MB 以下）
            </p>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
};
