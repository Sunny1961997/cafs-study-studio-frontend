"use client";

import type { ReactNode } from "react";

/** The Studio's header block + framed container + footnote that surrounds an embedded module. */
export function ModuleFrame({ label, tag, desc, tip, children }: { label: string; tag: string; desc: string; tip: string; children: ReactNode }) {
  return (
    <>
      <section className="cafs22-context">
        <div>
          <strong>{label}</strong>
          <p>{desc}</p>
        </div>
        <span className="cafs22-sub">{tag}</span>
      </section>
      <div className="cafs22-embed">{children}</div>
      <p className="cafs22-tip">{tip}</p>
    </>
  );
}
