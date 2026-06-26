import { Timestamp } from "firebase/firestore";

export type BrandName = string;

export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export interface Brand {
  id: string;
  name: BrandName;
  description: string;
  threadsUserId: string;
  threadsAccessToken: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Post {
  id: string;
  brandId: string;
  userId: string;
  content: string;
  status: PostStatus;
  scheduledAt: Timestamp | null;
  publishedAt: Timestamp | null;
  threadsPostId: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  aiGenerated: boolean;
  aiPrompt: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface User {
  id: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GenerateRequest {
  prompt: string;
  brandName: BrandName;
  brandDescription?: string;
  tone?: "casual" | "professional" | "friendly";
}

export interface GenerateResponse {
  content: string;
}

export interface PublishRequest {
  postId: string;
  brandId: string;
  content: string;
  threadsUserId: string;
  threadsAccessToken: string;
  imageUrl?: string;
  imageUrls?: string[];
  replyToId?: string;
}

export interface PublishResponse {
  threadsPostId: string;
}
