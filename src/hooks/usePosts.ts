"use client";

import { useState, useEffect, useCallback } from "react";
import { getPosts, deletePost, updatePost } from "@/lib/firebase/firestore";
import { Post, PostStatus } from "@/types";
import { useAuth } from "./useAuth";

export const usePosts = (status?: PostStatus) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getPosts(user.uid, status);
      setPosts(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, status]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = async (postId: string) => {
    await deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const update = async (postId: string, data: Partial<Post>) => {
    await updatePost(postId, data);
    await fetch();
  };

  return { posts, loading, error, refetch: fetch, remove, update };
};
