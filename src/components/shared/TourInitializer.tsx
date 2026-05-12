'use client';

import { useEffect } from 'react';
import { useTourStore } from '@/lib/stores/useTourStore';

export function TourInitializer() {
  const startTour = useTourStore((s) => s.startTour);

  useEffect(() => {
    const completed = localStorage.getItem('tour_completed');
    if (!completed) {
      startTour();
    }
  }, [startTour]);

  return null;
}
