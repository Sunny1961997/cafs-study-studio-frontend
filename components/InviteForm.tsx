"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountFields, Gate, openSession } from "@/components/Gate";
import { api, errorText, getToken } from "@/lib/api";

type InviteStatus = {
  status?: "open" | "expired" | "full";
  inviter_name?: string | null;
  message?: string;
};

export default function InvitePage({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<InviteStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getToken()) {
      router.replace("/studio");
      return;
    }
    api<InviteStatus>(`/api/invitations/${token}`)
      .then(setStatus)
      .catch((caught) => setError(errorText(caught)));
  }, [router, token]);

  const closed = status && status.status !== "open";

  return (
    <Gate
      title="Accept your invitation"
      lede={
        status?.inviter_name
          ? `${status.inviter_name} invited you to a licensed copy of CAFS Study Studio. Your name and email are recorded only if you agree.`
          : "This invitation creates a licensed study account. Your name and email are recorded only if you agree."
      }
    >
      {error ? <div className="form-error">{error}</div> : null}
      {!status && !error ? <p className="lede">Checking this invitation…</p> : null}
      {closed ? (
        <p className="lede">
          {status?.status === "expired"
            ? "This invitation has expired. Ask the sender for a new link."
            : "This invitation has reached its enrollment limit."}{" "}
          <Link href="/login">Sign in</Link> if you already have an account.
        </p>
      ) : null}
      {status?.status === "open" ? (
        <AccountFields
          includeName
          submitLabel="Create my licensed account"
          footer={
            <>
              Already have an account? <Link href="/login">Sign in</Link>
            </>
          }
          onSubmit={async (values) => {
            await openSession(`/api/invitations/${token}/enroll`, values);
            router.push("/studio");
          }}
        />
      ) : null}
    </Gate>
  );
}
