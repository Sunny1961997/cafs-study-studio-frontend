"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  api,
  downloadEnrollmentCsv,
  errorText,
  getCachedAccount,
  getToken,
  logout,
  type Enrollment,
} from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Enrollment[] | null>(null);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [accountName, setAccountName] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    setAccountName(getCachedAccount()?.name ?? "");

    api<{ enrollments: Enrollment[] }>("/api/admin/enrollments")
      .then((data) => setRows(data.enrollments))
      .catch((caught) => {
        if (caught && typeof caught === "object" && "status" in caught && (caught.status === 401 || caught.status === 403)) {
          router.replace(caught.status === 401 ? "/login" : "/studio");
          return;
        }
        setError(errorText(caught));
      });
  }, [router]);

  async function createInvite() {
    setPending(true);
    setError("");
    try {
      const data = await api<{ invitation_url: string; expires_at: string; max_enrollments: number }>(
        "/api/admin/invitations",
        { method: "POST" },
      );
      setInviteUrl(data.invitation_url);
      setNotice(`This owner link expires ${new Date(data.expires_at).toLocaleString()} and allows ${data.max_enrollments} enrollments. It is shown once.`);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="desk">
      <aside className="desk-side">
        <div className="desk-brand">
          <div className="mark">FCL</div>
          <div>
            <strong>CAFS Study Studio</strong>
            <span>Administrator</span>
          </div>
        </div>
        <Link className="desk-link active" href="/admin">
          Enrollment chain
        </Link>
        <Link className="desk-link" href="/studio">
          Open study studio
        </Link>
        <button
          className="desk-link"
          type="button"
          onClick={() => {
            void logout().then(() => router.replace("/login"));
          }}
        >
          Sign out
        </button>
        <p className="desk-note" style={{ marginTop: "auto", padding: "16px 12px" }}>
          {accountName ? `Signed in as ${accountName}` : "Distribution records"}
        </p>
      </aside>
      <main className="desk-main">
        <div className="desk-head">
          <div>
            <div className="eyebrow">Licensed distribution</div>
            <h1>Enrollment chain</h1>
            <p>
              People appear here after they register or accept an invitation. This list does not
              record exam scores, file opens, or forwards.
            </p>
          </div>
          <div className="actions">
            <button className="primary" type="button" onClick={createInvite} disabled={pending}>
              {pending ? "Creating…" : "Generate owner invitation"}
            </button>
            <button
              className="quiet"
              type="button"
              onClick={() => downloadEnrollmentCsv().catch((caught) => setError(errorText(caught)))}
            >
              Export CSV
            </button>
          </div>
        </div>
        {error ? <div className="form-error">{error}</div> : null}
        {inviteUrl ? (
          <section className="panel">
            <h2>Owner invitation</h2>
            <p>{notice}</p>
            <input className="invite-url" readOnly value={inviteUrl} aria-label="Invitation URL" />
          </section>
        ) : null}
        <section className="panel">
          <h2>Consented recipients</h2>
          {rows === null ? <p className="empty">Loading enrollment records…</p> : null}
          {rows && rows.length === 0 ? <p className="empty">No licensed recipients yet.</p> : null}
          {rows && rows.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>License</th>
                    <th>Recipient</th>
                    <th>Invited by</th>
                    <th>How they enrolled</th>
                    <th>Consented</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.license_reference}>
                      <td>{row.license_reference}</td>
                      <td>
                        {row.name}
                        <div className="empty">{row.email}</div>
                      </td>
                      <td>{row.parent_name ? `${row.parent_name} · ${row.parent_reference}` : "—"}</td>
                      <td>{row.enrolled_via}</td>
                      <td>{row.consented_at ? new Date(row.consented_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
