"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SamsaraRefresh({ children }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(
      () => {
        router.refresh();
      },
      5 * 60 * 1000,
    );
    return () => clearInterval(id);
  }, [router]);
  return children;
}
