"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccountFields, Gate, openSession } from "@/components/Gate";
import { getToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace("/studio");
  }, [router]);

  return (
    <Gate
      title="Create your license"
      lede="Registration issues a personal study license. Your exam progress stays in this browser."
    >
      <AccountFields
        includeName
        submitLabel="Create account"
        footer={
          <>
            Already licensed? <Link href="/login">Sign in</Link>
          </>
        }
        onSubmit={async (values) => {
          await openSession("/api/register", values);
          router.push("/studio");
        }}
      />
    </Gate>
  );
}
