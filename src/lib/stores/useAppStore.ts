import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  anonId: string | null;
  isHydrated: boolean;
  showDecimals: boolean;
}

interface AppActions {
  setAnonId: (id: string) => void;
  setHydrated: (hydrated: boolean) => void;
  setShowDecimals: (v: boolean) => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      anonId: null,
      isHydrated: false,
      showDecimals: false,

      setAnonId: (id) => set({ anonId: id }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      setShowDecimals: (v) => set({ showDecimals: v }),
    }),
    {
      name: "app_state",
      version: 1,
      // Persist anonId and showDecimals, not isHydrated
      partialize: (state) => ({ anonId: state.anonId, showDecimals: state.showDecimals }),
    }
  )
);
