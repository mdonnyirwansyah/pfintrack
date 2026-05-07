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
  loadCustomReports: () => Promise<void>;
  createCustomReport: (input: CreateCustomReportInput) => Promise<CustomReport>;
  updateCustomReport: (id: string, patch: UpdateCustomReportInput) => Promise<CustomReport>;
  softDeleteCustomReport: (id: string) => Promise<void>;
  isNameTaken: (name: string, excludeId?: string) => boolean;
}

type ReportStore = ReportState & ReportActions;

export const useReportStore = create<ReportStore>()((set, get) => ({
  customReports: [],
  isLoading: true,

  async loadCustomReports() {
    set({ isLoading: true });
    const customReports = await customReportsRepo.getAll();
    set({ customReports, isLoading: false });
  },

  async createCustomReport(input) {
    const report = await customReportsRepo.create(input);
    const customReports = await customReportsRepo.getAll();
    set({ customReports });
    return report;
  },

  async updateCustomReport(id, patch) {
    const updated = await customReportsRepo.update(id, patch);
    const customReports = await customReportsRepo.getAll();
    set({ customReports });
    return updated;
  },

  async softDeleteCustomReport(id) {
    await customReportsRepo.softDelete(id);
    const customReports = await customReportsRepo.getAll();
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
