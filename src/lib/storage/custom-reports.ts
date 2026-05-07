import type { CustomReport } from "@/lib/types/report";
import { readKey, writeKey } from "./base";
import { getOrCreateAnonId } from "./anon-id";
import { STORAGE_BACKEND } from "./config";
import { customReportsIdbRepo } from "./custom-reports-idb";

const KEY = "custom_reports";

export type CreateCustomReportInput = {
  name: string;
  start_date: string;
  end_date: string;
};

export type UpdateCustomReportInput = Partial<
  Pick<CustomReport, "name" | "start_date" | "end_date">
>;

const customReportsLsRepo = {
  getAll(): CustomReport[] {
    return readKey<CustomReport>(KEY).filter((r) => r.is_active);
  },

  getAllIncludingInactive(): CustomReport[] {
    return readKey<CustomReport>(KEY);
  },

  getById(id: string): CustomReport | null {
    return readKey<CustomReport>(KEY).find((r) => r.id === id) ?? null;
  },

  findByName(name: string): CustomReport | null {
    const normalized = name.trim().toLowerCase();
    return (
      readKey<CustomReport>(KEY).find(
        (r) => r.is_active && r.name.trim().toLowerCase() === normalized
      ) ?? null
    );
  },

  create(input: CreateCustomReportInput): CustomReport {
    const all = readKey<CustomReport>(KEY);
    const now = new Date().toISOString();
    const report: CustomReport = {
      id: crypto.randomUUID(),
      anon_id: getOrCreateAnonId(),
      name: input.name.trim(),
      start_date: input.start_date,
      end_date: input.end_date,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    writeKey(KEY, [...all, report]);
    return report;
  },

  update(id: string, patch: UpdateCustomReportInput): CustomReport {
    const all = readKey<CustomReport>(KEY);
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`CustomReport not found: ${id}`);
    const updated: CustomReport = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
    all[idx] = updated;
    writeKey(KEY, all);
    return updated;
  },

  softDelete(id: string): void {
    const all = readKey<CustomReport>(KEY);
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`CustomReport not found: ${id}`);
    all[idx] = { ...all[idx], is_active: false, updated_at: new Date().toISOString() };
    writeKey(KEY, all);
  },
};

// ---------------------------------------------------------------------------
// Unified repo — delegates to IDB or localStorage based on STORAGE_BACKEND
// ---------------------------------------------------------------------------

export const customReportsRepo = {
  getAll(): Promise<CustomReport[]> {
    if (STORAGE_BACKEND === "idb") return customReportsIdbRepo.getAll();
    return Promise.resolve(customReportsLsRepo.getAll());
  },

  getAllIncludingInactive(): Promise<CustomReport[]> {
    if (STORAGE_BACKEND === "idb") return customReportsIdbRepo.getAllIncludingInactive();
    return Promise.resolve(customReportsLsRepo.getAllIncludingInactive());
  },

  getById(id: string): Promise<CustomReport | null> {
    if (STORAGE_BACKEND === "idb") return customReportsIdbRepo.getById(id);
    return Promise.resolve(customReportsLsRepo.getById(id));
  },

  findByName(name: string): Promise<CustomReport | null> {
    if (STORAGE_BACKEND === "idb") return customReportsIdbRepo.findByName(name);
    return Promise.resolve(customReportsLsRepo.findByName(name));
  },

  create(input: CreateCustomReportInput): Promise<CustomReport> {
    if (STORAGE_BACKEND === "idb") return customReportsIdbRepo.create(input);
    return Promise.resolve(customReportsLsRepo.create(input));
  },

  update(id: string, patch: UpdateCustomReportInput): Promise<CustomReport> {
    if (STORAGE_BACKEND === "idb") return customReportsIdbRepo.update(id, patch);
    return Promise.resolve(customReportsLsRepo.update(id, patch));
  },

  softDelete(id: string): Promise<void> {
    if (STORAGE_BACKEND === "idb") return customReportsIdbRepo.softDelete(id);
    customReportsLsRepo.softDelete(id);
    return Promise.resolve();
  },
};
