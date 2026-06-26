"use client";

import { useState, useEffect, useCallback } from "react";
import { getBrands } from "@/lib/firebase/firestore";
import { Brand } from "@/types";
import { useAuth } from "./useAuth";

export const useBrands = () => {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getBrands(user.uid);
      setBrands(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { brands, loading, refetch: fetch };
};
