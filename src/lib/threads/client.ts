const THREADS_API_BASE = "https://graph.threads.net/v1.0";

interface ThreadsCreateContainerResponse {
  id: string;
}

interface ThreadsPublishResponse {
  id: string;
}

export const createThreadsContainer = async (
  userId: string,
  accessToken: string,
  text: string,
  options?: { imageUrl?: string; replyToId?: string }
): Promise<string> => {
  const params = new URLSearchParams({ access_token: accessToken });

  if (options?.imageUrl) {
    params.set("media_type", "IMAGE");
    params.set("image_url", options.imageUrl);
    params.set("text", text);
  } else {
    params.set("media_type", "TEXT");
    params.set("text", text);
  }

  if (options?.replyToId) {
    params.set("reply_to_id", options.replyToId);
  }

  const res = await fetch(`${THREADS_API_BASE}/${userId}/threads?${params}`, { method: "POST" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Threads container creation failed: ${JSON.stringify(error)}`);
  }
  const data: ThreadsCreateContainerResponse = await res.json();
  return data.id;
};

export const publishThreadsContainer = async (
  userId: string,
  accessToken: string,
  containerId: string
): Promise<string> => {
  const params = new URLSearchParams({ creation_id: containerId, access_token: accessToken });
  const res = await fetch(`${THREADS_API_BASE}/${userId}/threads_publish?${params}`, { method: "POST" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Threads publish failed: ${JSON.stringify(error)}`);
  }
  const data: ThreadsPublishResponse = await res.json();
  return data.id;
};

export const postToThreads = async (
  userId: string,
  accessToken: string,
  text: string,
  options?: { imageUrl?: string; replyToId?: string }
): Promise<string> => {
  const containerId = await createThreadsContainer(userId, accessToken, text, options);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return publishThreadsContainer(userId, accessToken, containerId);
};

// カルーセル: 各画像をアイテムコンテナとして作成
const createCarouselItem = async (
  userId: string,
  accessToken: string,
  imageUrl: string
): Promise<string> => {
  const params = new URLSearchParams({
    media_type: "IMAGE",
    image_url: imageUrl,
    is_carousel_item: "true",
    access_token: accessToken,
  });
  const res = await fetch(`${THREADS_API_BASE}/${userId}/threads?${params}`, { method: "POST" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Carousel item creation failed: ${JSON.stringify(error)}`);
  }
  const data: ThreadsCreateContainerResponse = await res.json();
  return data.id;
};

export const postCarouselToThreads = async (
  userId: string,
  accessToken: string,
  imageUrls: string[],
  text: string
): Promise<string> => {
  // 各画像アイテムを並行作成
  const itemIds = await Promise.all(
    imageUrls.map((url) => createCarouselItem(userId, accessToken, url))
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // カルーセルコンテナを作成
  const carouselParams = new URLSearchParams({
    media_type: "CAROUSEL",
    children: itemIds.join(","),
    text,
    access_token: accessToken,
  });
  const containerRes = await fetch(`${THREADS_API_BASE}/${userId}/threads?${carouselParams}`, { method: "POST" });
  if (!containerRes.ok) {
    const error = await containerRes.json();
    throw new Error(`Carousel container creation failed: ${JSON.stringify(error)}`);
  }
  const container: ThreadsCreateContainerResponse = await containerRes.json();

  await new Promise((resolve) => setTimeout(resolve, 1000));
  return publishThreadsContainer(userId, accessToken, container.id);
};

// 動画コンテナのステータスをポーリングして完了を待つ
const waitForVideoContainer = async (
  containerId: string,
  accessToken: string,
  timeoutMs = 90_000
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    const params = new URLSearchParams({ fields: "status,error_message", access_token: accessToken });
    const res = await fetch(`${THREADS_API_BASE}/${containerId}?${params}`);
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status === "FINISHED") return;
    if (data.status === "ERROR") throw new Error(`動画処理エラー: ${data.error_message ?? "不明"}`);
  }
  throw new Error("動画処理がタイムアウトしました（90秒）");
};

export const postVideoToThreads = async (
  userId: string,
  accessToken: string,
  videoUrl: string,
  text: string
): Promise<string> => {
  const params = new URLSearchParams({
    media_type: "VIDEO",
    video_url: videoUrl,
    text,
    access_token: accessToken,
  });
  const res = await fetch(`${THREADS_API_BASE}/${userId}/threads?${params}`, { method: "POST" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Threads video container creation failed: ${JSON.stringify(error)}`);
  }
  const container: ThreadsCreateContainerResponse = await res.json();
  await waitForVideoContainer(container.id, accessToken);
  return publishThreadsContainer(userId, accessToken, container.id);
};

export const deleteThreadsPost = async (
  postId: string,
  accessToken: string
): Promise<void> => {
  const params = new URLSearchParams({ access_token: accessToken });
  const res = await fetch(`${THREADS_API_BASE}/${postId}?${params}`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Threads delete failed: ${JSON.stringify(error)}`);
  }
};
