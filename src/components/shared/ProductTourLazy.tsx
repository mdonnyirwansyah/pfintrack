"use client";

import dynamic from "next/dynamic";
import { useTourStore } from "@/lib/stores/useTourStore";

const ProductTour = dynamic(
  () => import("./ProductTour").then((m) => ({ default: m.ProductTour })),
  { ssr: false },
);

export function ProductTourLazy() {
  const run = useTourStore((s) => s.run);
  if (!run) return null;
  return <ProductTour />;
}
