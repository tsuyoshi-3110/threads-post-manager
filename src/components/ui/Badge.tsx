import { clsx } from "clsx";
import { PostStatus } from "@/types";

const statusConfig: Record<PostStatus, { label: string; className: string }> =
  {
    draft: {
      label: "下書き",
      className: "bg-gray-100 text-gray-700",
    },
    scheduled: {
      label: "予約中",
      className: "bg-yellow-100 text-yellow-700",
    },
    published: {
      label: "投稿済",
      className: "bg-green-100 text-green-700",
    },
    failed: {
      label: "失敗",
      className: "bg-red-100 text-red-700",
    },
  };

export const StatusBadge = ({ status }: { status: PostStatus }) => {
  const config = statusConfig[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
};
