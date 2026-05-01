import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomReport } from "@/lib/types/report";

interface ReportState {
  customReports: CustomReport[];
}

interface ReportActions {
  setCustomReports: (reports: CustomReport[]) => void;
  addCustomReport: (report: CustomReport) => void;
  updateCustomReport: (id: string, updates: Partial<CustomReport>) => void;
  softDeleteCustomReport: (id: string) => void;
}

type ReportStore = ReportState & ReportActions;

export const useReportStore = create<ReportStore>()(
  persist(
    (set) => ({
      customReports: [],

      setCustomReports: (customReports) => set({ customReports }),

      addCustomReport: (report) =>
        set((state) => ({
          customReports: [...state.customReports, report],
        })),

      updateCustomReport: (id, updates) =>
        set((state) => ({
          customReports: state.customReports.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      softDeleteCustomReport: (id) =>
        set((state) => ({
          customReports: state.customReports.map((r) =>
            r.id === id ? { ...r, is_active: false } : r
          ),
        })),
    }),
    {
      name: "custom_reports",
      version: 1,
    }
  )
);
