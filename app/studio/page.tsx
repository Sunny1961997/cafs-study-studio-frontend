"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, errorText, fetchStudioDocument, getToken } from "@/lib/api";

export default function StudioPage() {
  const router = useRouter();
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    let active = true;
    fetchStudioDocument()
      .then((documentHtml) => {
        if (active) setHtml(documentHtml);
      })
      .catch((caught) => {
        if (!active) return;
        if (caught && typeof caught === "object" && "status" in caught && caught.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }
        setError(errorText(caught));
      });

    function onMessage(event: MessageEvent) {
      const frame = document.querySelector("iframe.studio-frame");
      if (!frame || event.source !== frame.contentWindow) return;
      if (event.data?.type === "cafs-signout") {
        clearSession();
        router.replace("/login");
      }
      if (event.data?.type === "cafs-admin") {
        router.push("/admin");
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      active = false;
      window.removeEventListener("message", onMessage);
    };
  }, [router]);

  if (error) {
    return (
      <p className="studio-loading">
        {error}
      </p>
    );
  }

  if (!html) return <p className="studio-loading">Opening your study studio…</p>;

  return <iframe className="studio-frame" title="CAFS Study Studio" srcDoc={html} />;
}
