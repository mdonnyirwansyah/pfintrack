import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  anonId: string | null;
  isHydrated: boolean;
}

interface AppActions {
  setAnonId: (id: string) => void;
  setHydrated: (hydrated: boolean) => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      anonId: null,
      isHydrated: false,

      setAnonId: (id) => set({ anonId: id }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: "app_state",
      version: 1,
      // Only persist anonId, not isHydrated
      partialize: (state) => ({ anonId: state.anonId }),
    }
  )
);
