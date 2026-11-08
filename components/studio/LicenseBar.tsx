"use client";

// "Licensed to …" pill and the License & Share dialog in the top bar (v21 distribution script).
// The legacy page read its license data from an embedded <script id="cafs-license-config"> JSON.
// The backend still embeds that block in GET /api/studio, so it is read from there (once, when the
// dialog is first opened) and falls back to what the signed-in account provides when unreachable.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { API_URL, fetchStudioDocument, getCachedAccount } from "@/lib/api";
import { useT } from "@/lib/studio/StudioProvider";

type LicenseConf = {
  license_id?: string;
  assigned_to?: string;
  api_base_url?: string;
  license_token?: string;
  download_url?: string;
};

const subscribeNothing = () => () => {};
let confCache: LicenseConf | null = null;

async function loadConf(): Promise<LicenseConf> {
  if (confCache) return confCache;
  const account = getCachedAccount();
  let conf: LicenseConf = { license_id: account?.license_reference ?? "UNASSIGNED", assigned_to: account?.name ?? "" };
  try {
    const html = await fetchStudioDocument();
    const match = html.match(/<script type="application\/json" id="cafs-license-config">([\s\S]*?)<\/script>/);
    if (match) {
      conf = { ...conf, ...(JSON.parse(match[1]) as LicenseConf) };
      confCache = conf;
    }
  } catch {
    /* unreachable: keep the account-derived offline values */
  }
  return conf;
}

export function LicenseBar() {
  const t = useT();
  const name = useSyncExternalStore(subscribeNothing, () => getCachedAccount()?.name ?? "", () => "");
  const [open, setOpen] = useState(false);
  if (!name) return null;
  return (
    <div className="cafs21-licensebar">
      <span className="cafs21-licensepill" title="Licensed distribution reference">
        {t("license.pill", "Licensed to")} {name}
      </span>
      <button type="button" className="cafs21-sharebtn" id="cafs21-share-entry" onClick={() => setOpen(true)}>
        {t("license.button", "License & Share")}
      </button>
      {open && <LicenseDialog onClose={() => setOpen(false)} />}
    </div>
  );
}

function LicenseDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const account = getCachedAccount();
  const [conf, setConf] = useState<LicenseConf | null>(confCache);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    let live = true;
    if (!confCache) loadConf().then((c) => live && setConf(c));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      live = false;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const c: LicenseConf = conf ?? { license_id: account?.license_reference ?? "UNASSIGNED", assigned_to: account?.name ?? "" };
  const assigned = Boolean(c.license_token && c.license_id !== "UNASSIGNED");
  const online = assigned && Boolean(c.api_base_url);
  const message =
    status ||
    (conf === null
      ? "Loading license details…"
      : online
        ? "Ready to create an invitation."
        : "This is an unassigned or offline copy. Ask your distributor for a hosted invitation link to enable attributed sharing.");

  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copied.");
    } catch {
      const x = document.createElement("textarea");
      x.value = value;
      document.body.appendChild(x);
      x.select();
      try {
        document.execCommand("copy");
        setStatus("Copied.");
      } catch {
        setStatus("Select and copy: " + value);
      }
      x.remove();
    }
  }, []);

  async function createLink() {
    setBusy(true);
    setStatus("Requesting a new attributed invitation…");
    try {
      const base = String(c.api_base_url || API_URL).replace(/\/$/, "");
      const res = await fetch(base + "/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_token: c.license_token }),
      });
      if (!res.ok) throw Error("Service returned " + res.status);
      const data = (await res.json()) as { invitation_url?: string };
      if (!data.invitation_url) throw Error("Invitation URL not returned");
      setLink(data.invitation_url);
      setStatus("Link generated. Only successful enrollments appear in the owner dashboard.");
    } catch (e) {
      setStatus("Could not create a link: " + (e as Error).message + ". This copy still works offline.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      id="cafs21-tracker-ui"
      className="cafs21-backdrop"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="cafs21-dialog" role="dialog" aria-modal="true" aria-labelledby="cafs21-title">
        <button type="button" className="cafs21-close" id="cafs21-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <div className="cafs21-eyebrow">{t("license.eyebrow", "CAFS Study Studio · Distribution transparency")}</div>
        <h2 id="cafs21-title">{t("license.title", "Your licensed copy & sharing")}</h2>
        <p>
          {t(
            "license.intro",
            "Use the authorized sharing link when inviting a colleague. It attributes accepted invitations to this license. This feature does not spy on offline activity, access contacts, or detect someone forwarding the HTML file itself.",
          )}
        </p>
        <div className="cafs21-liccard">
          <small>Registered license holder</small>
          <b>{c.assigned_to || account?.name || ""}</b>
          <small>License reference</small>
          <b>{c.license_id || ""}</b>
          <small>Distribution mode</small>
          <b>{online ? "Hosted invitation tracking enabled" : "Offline · no remote tracking"}</b>
        </div>
        <div className="cafs21-actions">
          <button type="button" id="cafs21-newlink" className="cafs21-primary" disabled={!online || busy} onClick={createLink}>
            {t("license.create", "Create attributed invitation link")}
          </button>
          {c.download_url && (
            <a target="_blank" rel="noopener" href={c.download_url}>
              {t("license.download", "Download my licensed HTML")}
            </a>
          )}
          <button
            type="button"
            id="cafs21-copylabel"
            onClick={() => copy("CAFS Study Studio | Licensed to: " + (c.assigned_to ?? "") + " | License: " + (c.license_id ?? ""))}
          >
            {t("license.copyAttribution", "Copy license attribution")}
          </button>
        </div>
        <div id="cafs21-generated">
          {link && (
            <>
              <label htmlFor="cafs21-link" style={{ fontSize: 12, fontWeight: 750 }}>
                Your invitation URL
              </label>
              <input id="cafs21-link" className="cafs21-link" readOnly value={link} />
              <div className="cafs21-actions">
                <button type="button" id="cafs21-copylink" className="cafs21-primary" onClick={() => copy(link)}>
                  Copy invitation link
                </button>
              </div>
            </>
          )}
        </div>
        <div className="cafs21-privacy">
          <b>Privacy &amp; limitations:</b> The hosted invite flow collects an invited person&apos;s name and email only after that person agrees to receive a licensed copy. Your administrator can see who enrolled through each invitation. Creating a link is not evidence that it was forwarded; a recipient enrolling is evidence that the link was used. Offline file copying cannot be reliably detected. No hidden browser fingerprinting, IP tracking, or automatic activity reporting is included.
        </div>
        <p className="cafs21-message" id="cafs21-status">
          {message}
        </p>
      </section>
    </div>,
    document.body,
  );
}
