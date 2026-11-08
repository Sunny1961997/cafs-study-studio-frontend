"use client";

import { useRouter } from "next/navigation";
import "./legacy.css";
import { useEffect, useState, useSyncExternalStore } from "react";
import { injectDatasets } from "@/lib/studioData";
import { fetchStudioData } from "@/lib/studioFetch";
import { fetchStudioState, withStateShim } from "@/lib/studioState";
import { clearSession, errorText, fetchStudioDocument, getCachedAccount, getToken } from "@/lib/api";

export default function StudioPage() {
  const router = useRouter();
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  // Cached account is read from localStorage; server render and first paint use false.
  const isAdmin = useSyncExternalStore(
    () => () => {},
    () => getCachedAccount()?.role === "admin",
    () => false,
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    let active = true;
    Promise.all([fetchStudioDocument(), fetchStudioData(), fetchStudioState()])
      .then(([documentHtml, data, state]) => {
        // Account buttons live outside the document so the studio markup stays
        // identical to the supplied HTML (injected buttons reflow its top bar).
        const cleaned = documentHtml.replace(/<script id="cafs-account-controls">[\s\S]*?<\/script>/, "");
        // Fetched datasets replace the embedded copies; any that fail to load
        // keep the copy that ships inside the document.
        // Learner state (progress, saves, attempts) is loaded from and saved to the API.
        if (active) setHtml(withStateShim(injectDatasets(cleaned, data), state));
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
      const frame = document.querySelector<HTMLIFrameElement>("iframe.studio-frame");
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

  return (
    <>
      <iframe className="studio-frame" title="CAFS Study Studio" srcDoc={html} />
      <div className="studio-account">
        {isAdmin ? (
          <button type="button" onClick={() => router.push("/admin")}>
            Admin
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            clearSession();
            router.replace("/login");
          }}
        >
          Sign out
        </button>
      </div>
    </>
  );
}
