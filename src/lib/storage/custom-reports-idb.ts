import type { CustomReport } from "@/lib/types/report";
import {
  idbGet,
  idbGetAll,
  idbPut,
  idbPutAll,
} from "./idb-client";
import { getOrCreateAnonId } from "./anon-id";
import type { CreateCustomReportInput, UpdateCustomReportInput } from "./custom-reports";

const STORE = "custom_reports" as const;

export const customReportsIdbRepo = {
  async getAll(): Promise<CustomReport[]> {
    const all = await idbGetAll<CustomReport>(STORE);
    return all.filter((r) => r.is_active);
  },

  async getAllIncludingInactive(): Promise<CustomReport[]> {
    return idbGetAll<CustomReport>(STORE);
  },

  async getById(id: string): Promise<CustomReport | null> {
    return (await idbGet<CustomReport>(STORE, id)) ?? null;
  },

  async findByName(name: string): Promise<CustomReport | null> {
    const normalized = name.trim().toLowerCase();
    const all = await customReportsIdbRepo.getAll();
    return (
      all.find((r) => r.name.trim().toLowerCase() === normalized) ?? null
    );
  },

  async create(input: CreateCustomReportInput): Promise<CustomReport> {
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
    await idbPut<CustomReport>(STORE, report);
    return report;
  },

  async update(id: string, patch: UpdateCustomReportInput): Promise<CustomReport> {
    const existing = await idbGet<CustomReport>(STORE, id);
    if (!existing) throw new Error(`CustomReport not found: ${id}`);
    const updated: CustomReport = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    await idbPut<CustomReport>(STORE, updated);
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    const existing = await idbGet<CustomReport>(STORE, id);
    if (!existing) throw new Error(`CustomReport not found: ${id}`);
    await idbPut<CustomReport>(STORE, {
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    });
  },

  async putAll(records: CustomReport[]): Promise<void> {
    await idbPutAll<CustomReport>(STORE, records);
  },
};
