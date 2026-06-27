"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) return <LoadingSpinner className="h-screen" />;
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {/* Mobile top header */}
        <div className="sticky top-0 z-40 flex h-14 items-center border-b border-gray-200 bg-white px-4 md:hidden dark:border-gray-700 dark:bg-gray-900">
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Threads Manager
          </h1>
        </div>
        {/* Content — extra bottom padding on mobile for bottom nav */}
        <div className="mx-auto max-w-4xl px-4 py-4 pb-24 md:px-6 md:py-8 md:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
