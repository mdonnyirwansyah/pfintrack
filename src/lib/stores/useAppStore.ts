import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  anonId: string | null;
  isHydrated: boolean;
  showDecimals: boolean;
  isDemoMode: boolean;
}

interface AppActions {
  setAnonId: (id: string) => void;
  setHydrated: (hydrated: boolean) => void;
  setShowDecimals: (v: boolean) => void;
  setIsDemoMode: (v: boolean) => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      anonId: null,
      isHydrated: false,
      showDecimals: false,
      isDemoMode: false,

      setAnonId: (id) => set({ anonId: id }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      setShowDecimals: (v) => set({ showDecimals: v }),
      setIsDemoMode: (v) => set({ isDemoMode: v }),
    }),
    {
      name: "app_state",
      version: 1,
      partialize: (state) => ({
        anonId: state.anonId,
        showDecimals: state.showDecimals,
        isDemoMode: state.isDemoMode,
      }),
    }
  )
);
