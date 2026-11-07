"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccountFields, Gate, openSession } from "@/components/Gate";
import { getToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace("/studio");
  }, [router]);

  return (
    <Gate title="Sign in" lede="Use the account that holds your CAFS study license.">
      <AccountFields
        submitLabel="Sign in"
        footer={
          <>
            New here? <Link href="/register">Create an account</Link>
          </>
        }
        onSubmit={async ({ email, password }) => {
          await openSession("/api/login", { email, password });
          router.push("/studio");
        }}
      />
    </Gate>
  );
}
