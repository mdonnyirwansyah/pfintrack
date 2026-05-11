import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ReportVisibility {
  showSavingRateCard: boolean;
  showLoanOutstanding: boolean;
  showInsightCard: boolean;
  showDonutChart: boolean;
  showLoanRow: boolean;
  showBalanceCorrectionRow: boolean;
}

interface AppState {
  anonId: string | null;
  isHydrated: boolean;
  showDecimals: boolean;
  reportVisibility: ReportVisibility;
}

interface AppActions {
  setAnonId: (id: string) => void;
  setHydrated: (hydrated: boolean) => void;
  setShowDecimals: (v: boolean) => void;
  setReportVisibility: (key: keyof ReportVisibility, value: boolean) => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      anonId: null,
      isHydrated: false,
      showDecimals: false,
      reportVisibility: {
        showSavingRateCard: true,
        showLoanOutstanding: true,
        showInsightCard: true,
        showDonutChart: true,
        showLoanRow: true,
        showBalanceCorrectionRow: true,
      },

      setAnonId: (id) => set({ anonId: id }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      setShowDecimals: (v) => set({ showDecimals: v }),
      setReportVisibility: (key, value) =>
        set((s) => ({ reportVisibility: { ...s.reportVisibility, [key]: value } })),
    }),
    {
      name: "app_state",
      version: 1,
      partialize: (state) => ({
        anonId: state.anonId,
        showDecimals: state.showDecimals,
        reportVisibility: state.reportVisibility,
      }),
    }
  )
);
