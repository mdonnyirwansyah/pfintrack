"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ReactNode, CSSProperties } from "react";

interface ConsentLinkProps {
  readonly href: Route;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export function ConsentLink({ href, children, className, style }: ConsentLinkProps) {
  const handleClick = () => {
    try {
      if (!localStorage.getItem("pfintrack_consent_accepted_at")) {
        localStorage.setItem("pfintrack_consent_accepted_at", new Date().toISOString());
      }
    } catch {}
  };

  return (
    <Link href={href} onClick={handleClick} className={className} style={style}>
      {children}
    </Link>
  );
}
