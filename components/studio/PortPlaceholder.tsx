"use client";

import { NAV_ITEMS } from "@/lib/studio/nav";

/** Shown by pages that have not been ported to React yet. */
export function PortPlaceholder({ id }: { id: string }) {
  const label = NAV_ITEMS.find((item) => item.id === id)?.label ?? id;
  return (
    <section className="paper" style={{ padding: 24 }}>
      <h1>{label}</h1>
      <p>This page is being ported to React.</p>
    </section>
  );
}
