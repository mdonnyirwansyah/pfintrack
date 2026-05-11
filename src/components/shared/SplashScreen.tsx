"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function SplashScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const t = useTranslations("splash");

  useEffect(() => {
    const toHold = setTimeout(() => setPhase("hold"), 400);
    const toOut  = setTimeout(() => setPhase("out"),  1600);
    const toNav  = setTimeout(() => router.replace("/transactions"), 2100);
    return () => {
      clearTimeout(toHold);
      clearTimeout(toOut);
      clearTimeout(toNav);
    };
  }, [router]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "var(--bg-primary)",
        opacity: phase === "out" ? 0 : 1,
        transition: (() => {
          if (phase === "in") return "opacity 0.4s ease-out";
          if (phase === "out") return "opacity 0.45s ease-in";
          return "none";
        })(),
        zIndex: 9999,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "var(--color-brand)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(91,141,239,0.35), 0 2px 8px rgba(91,141,239,0.20)",
          transform: phase === "in" ? "scale(0.88)" : "scale(1)",
          transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M10 26V12h10a5 5 0 0 1 0 10H10"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 19h8"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* App name + tagline */}
      <div
        style={{
          textAlign: "center",
          opacity: phase === "in" ? 0 : 1,
          transform: phase === "in" ? "translateY(8px)" : "translateY(0)",
          transition: "opacity 0.4s ease-out 0.15s, transform 0.4s ease-out 0.15s",
        }}
      >
        <p
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          PFinTrack
        </p>
        <p
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: "var(--text-tertiary)",
            marginTop: 6,
          }}
        >
          {t("tagline")}
        </p>
      </div>

      {/* Loading dots */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom) + 48px)",
          display: "flex",
          gap: 6,
          opacity: phase === "hold" ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={`dot-${i}`}
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--color-brand)",
              animation: `splashDot 1s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splashDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
