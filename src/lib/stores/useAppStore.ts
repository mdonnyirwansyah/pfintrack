import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ReportVisibility {
  showSavingRateCard: boolean;
  showLoanOutstanding: boolean;
  showInsightCard: boolean;
  showDonutChart: boolean;
  showLoanRow: boolean;
  showBalanceCorrectionRow: boolean;
  showMonthlyOverviewChart: boolean;
  showNetWorthChart: boolean;
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
  setAllReportVisibility: (value: boolean) => void;
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
        showMonthlyOverviewChart: true,
        showNetWorthChart: true,
      },

      setAnonId: (id) => set({ anonId: id }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      setShowDecimals: (v) => set({ showDecimals: v }),
      setReportVisibility: (key, value) =>
        set((s) => ({ reportVisibility: { ...s.reportVisibility, [key]: value } })),
      setAllReportVisibility: (value) =>
        set((s) => ({
          reportVisibility: Object.fromEntries(
            Object.keys(s.reportVisibility).map((k) => [k, value])
          ) as unknown as ReportVisibility,
        })),
    }),
    {
      name: "app_state",
      version: 1,
      partialize: (state) => ({
        anonId: state.anonId,
        showDecimals: state.showDecimals,
        reportVisibility: state.reportVisibility,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppStore>;
        return {
          ...current,
          ...p,
          reportVisibility: { ...current.reportVisibility, ...p.reportVisibility },
        };
      },
    }
  )
);
