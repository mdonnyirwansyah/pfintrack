"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ConsentRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      const accepted = localStorage.getItem("pfintrack_consent_accepted_at");
      if (accepted) {
        router.replace("/transactions");
      }
    } catch {}
  }, [router]);

  return null;
}
