import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./config";
import { Post, Brand, PostStatus, Product } from "@/types";

const db = () => getFirebaseDb();

// Firestore の複合インデックス不要にするため orderBy は使わずクライアントでソート

// --- Users ---

export const createUser = async (userId: string, email: string) => {
  const ref = doc(db(), "users", userId);
  await updateDoc(ref, {
    id: userId,
    email,
    updatedAt: serverTimestamp(),
  }).catch(() =>
    addDoc(collection(db(), "users"), {
      id: userId,
      email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
};

// --- Brands ---

export const getBrands = async (userId: string): Promise<Brand[]> => {
  const q = query(collection(db(), "brands"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const brands = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Brand));
  return brands.sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() ?? 0;
    const bMs = b.createdAt?.toMillis?.() ?? 0;
    return aMs - bMs;
  });
};

export const getBrand = async (brandId: string): Promise<Brand | null> => {
  const snap = await getDoc(doc(db(), "brands", brandId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Brand;
};

export const createBrand = async (
  data: Omit<Brand, "id" | "createdAt" | "updatedAt">
) => {
  const ref = await addDoc(collection(db(), "brands"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateBrand = async (
  brandId: string,
  data: Partial<Omit<Brand, "id" | "createdAt">>
) => {
  await updateDoc(doc(db(), "brands", brandId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteBrand = async (brandId: string) => {
  await deleteDoc(doc(db(), "brands", brandId));
};

// --- Posts ---

export const getPosts = async (
  userId: string,
  status?: PostStatus
): Promise<Post[]> => {
  const constraints = [where("userId", "==", userId)];
  if (status) constraints.push(where("status", "==", status));

  const q = query(collection(db(), "posts"), ...constraints);
  const snap = await getDocs(q);
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
  return posts.sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() ?? 0;
    const bMs = b.createdAt?.toMillis?.() ?? 0;
    return bMs - aMs; // 新しい順
  });
};

export const getPost = async (postId: string): Promise<Post | null> => {
  const snap = await getDoc(doc(db(), "posts", postId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Post;
};

export const createPost = async (
  data: Omit<Post, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const ref = await addDoc(collection(db(), "posts"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updatePost = async (
  postId: string,
  data: Partial<Omit<Post, "id" | "createdAt">>
) => {
  await updateDoc(doc(db(), "posts", postId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deletePost = async (postId: string) => {
  await deleteDoc(doc(db(), "posts", postId));
};

// --- Products ---

export const getProducts = async (userId: string): Promise<Product[]> => {
  const q = query(collection(db(), "products"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const products = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
  return products.sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() ?? 0;
    const bMs = b.createdAt?.toMillis?.() ?? 0;
    return aMs - bMs;
  });
};

export const createProduct = async (
  data: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const ref = await addDoc(collection(db(), "products"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateProduct = async (
  productId: string,
  data: Partial<Omit<Product, "id" | "createdAt">>
) => {
  await updateDoc(doc(db(), "products", productId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteProduct = async (productId: string) => {
  await deleteDoc(doc(db(), "products", productId));
};

// 予約投稿：scheduledAt が過去のもの（cron用）
// 複合インデックス不要のため status のみでフィルタし、JS 側で時刻チェック
export const getReadyScheduledPosts = async (): Promise<Post[]> => {
  const now = Timestamp.now();
  const q = query(
    collection(db(), "posts"),
    where("status", "==", "scheduled")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Post))
    .filter((p) => p.scheduledAt && p.scheduledAt.toMillis() <= now.toMillis());
};
