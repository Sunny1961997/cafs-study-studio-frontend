"use client";

import { useRouter } from "next/navigation";
import { pageHref } from "@/lib/studio/nav";

/** The original `go(label, page)` helper: a small button that opens a studio page. */
export function GoButton({ page, children, className = "btn btn-sm" }: { page: string; children: string; className?: string }) {
  const router = useRouter();
  return (
    <button type="button" className={className} data-page={page} onClick={() => router.push(pageHref(page))}>
      {children}
    </button>
  );
}
