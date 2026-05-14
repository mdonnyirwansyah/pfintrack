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
    if (globalThis.window !== undefined) {
      globalThis.localStorage.removeItem('tour_completed');
    }
    set({ run: true });
  },
  completeTour: () => {
    if (globalThis.window !== undefined) {
      globalThis.localStorage.setItem('tour_completed', new Date().toISOString());
    }
    set({ run: false });
  },
  skipTour: () => {
    if (globalThis.window !== undefined) {
      globalThis.localStorage.setItem('tour_completed', new Date().toISOString());
    }
    set({ run: false });
  },
}));
