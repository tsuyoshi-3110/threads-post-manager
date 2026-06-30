"use client";

import { useState, useEffect, useCallback } from "react";
import { getProducts } from "@/lib/firebase/firestore";
import { Product } from "@/types";
import { useAuth } from "./useAuth";

export const useProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getProducts(user.uid);
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { products, loading, refetch: fetch };
};
