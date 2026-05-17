'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTourStore } from '@/lib/stores/useTourStore';

export function TourInitializer() {
  const pathname = usePathname();
  const startTour = useTourStore((s) => s.startTour);

  useEffect(() => {
    if (pathname === '/') return;
    const completed = localStorage.getItem('tour_completed');
    if (!completed) {
      startTour();
    }
  }, [pathname, startTour]);

  return null;
}
