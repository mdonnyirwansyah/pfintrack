"use client";

import { useRef, useCallback } from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  delay?: number; // ms, default 500
}

/**
 * Returns touch/mouse event handlers that fire `onLongPress` after `delay` ms of continuous press.
 * Cancels if the pointer moves significantly or is released early.
 */
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
      // If long press fired, prevent the synthetic click from propagating
      if (firedRef.current) {
        e.preventDefault();
      }
    },
    [cancel]
  );

  return { onTouchStart, onTouchMove, onTouchEnd };
}
