"use client";

import { Post } from "@/types";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";

interface Props {
  post: Post;
  brandName?: string;
  onDelete?: (id: string) => void;
  onPublish?: (post: Post) => void;
  onSchedule?: (post: Post) => void;
  onEdit?: (post: Post) => void;
  showActions?: boolean;
}

const toDate = (ts: Timestamp | null): Date | null => {
  if (!ts) return null;
  return ts.toDate();
};

export const PostCard = ({
  post,
  brandName,
  onDelete,
  onPublish,
  onSchedule,
  onEdit,
  showActions = true,
}: Props) => {
  const createdAt = toDate(post.createdAt);
  const publishedAt = toDate(post.publishedAt);
  const scheduledAt = toDate(post.scheduledAt);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={post.status} />
          {brandName && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {brandName}
            </span>
          )}
          {post.aiGenerated && (
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              AI生成
            </span>
          )}
        </div>
        {createdAt && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {format(createdAt, "yyyy/MM/dd HH:mm", { locale: ja })}
          </span>
        )}
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
        {post.content}
      </p>

      {/* メディアプレビュー */}
      {post.imageUrl && (
        <div className="mt-3">
          <img src={post.imageUrl} alt="添付画像" className="max-h-48 rounded-lg object-cover" />
        </div>
      )}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {post.imageUrls.map((url, i) => (
            <img key={i} src={url} alt={`画像${i + 1}`} className="h-32 w-32 flex-shrink-0 rounded-lg object-cover" />
          ))}
        </div>
      )}
      {post.videoUrl && (
        <div className="mt-3">
          <video src={post.videoUrl} controls className="max-h-48 w-full rounded-lg" />
        </div>
      )}

      {scheduledAt && post.status === "scheduled" && (
        <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
          📅 {format(scheduledAt, "yyyy/MM/dd HH:mm", { locale: ja })} に投稿予定
        </p>
      )}
      {publishedAt && post.status === "published" && (
        <p className="mt-2 text-xs text-green-600 dark:text-green-400">
          ✅ {format(publishedAt, "yyyy/MM/dd HH:mm", { locale: ja })} に投稿済み
        </p>
      )}

      {showActions && (
        <div className="mt-4 flex gap-2">
          {post.status === "draft" && onPublish && (
            <Button size="sm" onClick={() => onPublish(post)}>
              今すぐ投稿
            </Button>
          )}
          {post.status === "draft" && onSchedule && (
            <Button size="sm" variant="secondary" onClick={() => onSchedule(post)}>
              🕐 予約投稿
            </Button>
          )}
          {post.status === "draft" && onEdit && (
            <Button size="sm" variant="secondary" onClick={() => onEdit(post)}>
              ✏️ 編集
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="danger" onClick={() => onDelete(post.id)}>
              削除
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
