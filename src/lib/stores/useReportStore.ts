"use client";

import { create } from "zustand";
import type { CustomReport } from "@/lib/types/report";
import {
  customReportsRepo,
  type CreateCustomReportInput,
  type UpdateCustomReportInput,
} from "@/lib/storage/custom-reports";

interface ReportState {
  customReports: CustomReport[];
  isLoading: boolean;
}

interface ReportActions {
  /** Load all active custom reports from localStorage */
  loadCustomReports: () => void;

  /** Create a new custom report and refresh state */
  createCustomReport: (input: CreateCustomReportInput) => CustomReport;

  /** Update an existing custom report and refresh state */
  updateCustomReport: (
    id: string,
    patch: UpdateCustomReportInput
  ) => CustomReport;

  /** Soft-delete a custom report and refresh state */
  softDeleteCustomReport: (id: string) => void;

  /** Check if a name is taken (case-insensitive). Pass excludeId when editing. */
  isNameTaken: (name: string, excludeId?: string) => boolean;
}

type ReportStore = ReportState & ReportActions;

export const useReportStore = create<ReportStore>()((set, get) => ({
  customReports: [],
  isLoading: true,

  loadCustomReports() {
    set({ isLoading: true });
    const customReports = customReportsRepo.getAll();
    set({ customReports, isLoading: false });
  },

  createCustomReport(input) {
    const report = customReportsRepo.create(input);
    const customReports = customReportsRepo.getAll();
    set({ customReports });
    return report;
  },

  updateCustomReport(id, patch) {
    const updated = customReportsRepo.update(id, patch);
    const customReports = customReportsRepo.getAll();
    set({ customReports });
    return updated;
  },

  softDeleteCustomReport(id) {
    customReportsRepo.softDelete(id);
    const customReports = customReportsRepo.getAll();
    set({ customReports });
  },

  isNameTaken(name, excludeId) {
    const normalized = name.trim().toLowerCase();
    return get().customReports.some(
      (r) =>
        r.is_active &&
        r.name.trim().toLowerCase() === normalized &&
        r.id !== excludeId
    );
  },
}));
