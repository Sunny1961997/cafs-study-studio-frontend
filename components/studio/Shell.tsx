"use client";

// The studio frame: sidebar (brand, navigation, progress), top bar and the content area.
// Markup and class names are those of the original page so studio.css applies unchanged.

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { LicenseBar } from "@/components/studio/LicenseBar";
import { Icon } from "@/lib/studio/Icon";
import { useDb } from "@/lib/studio/db";
import { getStats } from "@/lib/studio/engine";
import { NAV, NAV_ITEMS, pageHref, pageIdFromPath } from "@/lib/studio/nav";
import { getItem, setItem, useStoredString } from "@/lib/studio/store";
import { useCrumb, useStudioData } from "@/lib/studio/StudioProvider";

const THEME_KEY = "cafs_studio_theme";
const THEME_INIT_KEY = "cafs_v11_theme_init";
const MEMORY_KEY = "cafs_v5_personal_memory_a1";
const FONT_PX = [15, 16, 18];
const OPTION_PX = [14, 16, 18];
const STEM_PX = [19, 21, 24];

const subscribeNothing = () => () => {};

export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { exams } = useStudioData();
  const [db] = useDb();
  const crumb = useCrumb();
  const theme = useStoredString(THEME_KEY) === "dark" ? "dark" : "light";
  const [font, setFont] = useState(0);
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);

  // First visit starts in the light theme (as the original did).
  useEffect(() => {
    if (getItem(THEME_INIT_KEY) === null) {
      setItem(THEME_KEY, "light");
      setItem(THEME_INIT_KEY, "1");
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Text-size button: body font size, reader scale and the option/stem sizes.
  useEffect(() => {
    document.body.style.fontSize = `${FONT_PX[font]}px`;
    document.documentElement.style.setProperty("--reader-scale", String(font));
    let style = document.getElementById("userFont") as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = "userFont";
      document.head.append(style);
    }
    style.textContent = `.option-text{font-size:${OPTION_PX[font]}px!important}.stem{font-size:${STEM_PX[font]}px!important}`;
  }, [font]);

  const page = pageIdFromPath(pathname);
  const activePage = /^(exam|results)$/.test(page) ? "overview" : page;
  const stats = getStats(exams, db);
  const label = NAV_ITEMS.find((item) => item.id === page)?.label ?? "";

  function backupProgress() {
    let memory: unknown = null;
    try {
      memory = JSON.parse(getItem(MEMORY_KEY) || "null");
    } catch {
      memory = null;
    }
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), version: "5.0", memory }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CAFS_Study_Kit_Progress_Backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="hs-brandline">
            <div className="hs-brandmark" aria-hidden="true">
              CS
            </div>
            <div>
              <div className="hs-brandtitle">CAFS Study Studio</div>
              <div className="hs-brandsub">Fraud Risk · Detection · Investigation</div>
            </div>
          </div>
          <div className="hs-powered">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/studio/fcl-logo.png" alt="Financial Crime Lab logo" />
            <div>
              <div className="hs-powered-label">Powered by</div>
              <div className="hs-powered-name">Financial Crime Lab</div>
            </div>
          </div>
        </div>
        <div className="nav-label">CAFS STUDY STUDIO</div>
        <nav className="side-nav" aria-label="Primary navigation">
          {NAV.map((section) => (
            <div key={section.title} style={{ display: "contents" }}>
              <div className="nav-section-title">{section.title}</div>
              {section.items.map((item) => (
                <button key={item.id} className={`nav-link ${item.id === activePage ? "active" : ""}`} data-page={item.id} onClick={() => router.push(pageHref(item.id))}>
                  <span data-icon={item.icon}>
                    <Icon name={item.icon} />
                  </span>{" "}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-bottom">
          <button className="btn btn-sm" style={{ margin: "10px 6px 0", maxWidth: 205 }} onClick={backupProgress}>
            Backup learning progress
          </button>
          <div className="side-progress">
            <strong>Your overall progress</strong>
            <div className="mini-track">
              <i id="sideBarProgress" style={{ width: `${stats.answerCount / Math.max(exams.length, 1)}%` }} />
            </div>
            <small id="sideBarCount">{`${stats.answerCount} of ${exams.length * 100} questions answered`}</small>
          </div>
          <div style={{ color: "#879bb5", fontSize: 11, margin: "19px 8px" }}>FRAUD INTELLIGENCE · v22</div>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="crumb">
            CAFS Study Studio <span style={{ color: "var(--faint)", padding: "0 7px" }}>/</span> <b id="breadcrumb">{crumb ?? label}</b>
          </div>
          <div className="top-actions">
            <LicenseBar />
            <span className="top-tiny">
              <span className="status-dot" /> Works offline
            </span>
            <button className="icon-button" id="fontButton" title="Increase text size" aria-label="Increase text size" onClick={() => setFont((font + 1) % 3)}>
              <span data-icon="type">
                <Icon name="type" />
              </span>
            </button>
            <button className="icon-button" id="themeButton" title="Toggle light and dark theme" aria-label="Toggle light and dark theme" onClick={() => setItem(THEME_KEY, theme === "dark" ? "light" : "dark")}>
              <span data-icon={theme === "dark" ? "sun" : "moon"}>{mounted ? <Icon name={theme === "dark" ? "sun" : "moon"} /> : null}</span>
            </button>
          </div>
        </div>
        <main className="content" id="mainContent">
          {children}
        </main>
      </div>
    </div>
  );
}
