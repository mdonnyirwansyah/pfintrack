'use client';
import { create } from 'zustand';

interface TourStore {
  run: boolean;
  startTour: () => void;
  stopTour: () => void;
  resetTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
}

export const useTourStore = create<TourStore>((set) => ({
  run: false,
  startTour: () => set({ run: true }),
  stopTour: () => set({ run: false }),
  resetTour: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tour_completed');
    }
    set({ run: true });
  },
  completeTour: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tour_completed', new Date().toISOString());
    }
    set({ run: false });
  },
  skipTour: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tour_completed', new Date().toISOString());
    }
    set({ run: false });
  },
}));
