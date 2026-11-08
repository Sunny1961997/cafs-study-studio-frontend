"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getToken } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? "/studio" : "/login");
  }, [router]);

  return <p className="gate-loading">Opening CAFS Study Studio…</p>;
}
