"use client";

import { useRef, useCallback } from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  delay?: number;
}

export function useLongPress({ onLongPress, delay = 500 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const firedRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      firedRef.current = false;
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress();
      }, delay);
    },
    [onLongPress, delay]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dx = Math.abs(e.touches[0].clientX - startXRef.current);
      const dy = Math.abs(e.touches[0].clientY - startYRef.current);
      if (dx > 10 || dy > 10) cancel();
    },
    [cancel]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      cancel();
      if (firedRef.current) {
        e.preventDefault();
      }
    },
    [cancel]
  );

  return { onTouchStart, onTouchMove, onTouchEnd };
}
