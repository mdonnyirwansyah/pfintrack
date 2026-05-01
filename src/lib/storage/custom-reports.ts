import type { CustomReport } from "@/lib/types/report";
import { readKey, writeKey } from "./base";
import { getOrCreateAnonId } from "./anon-id";

const KEY = "custom_reports";

export type CreateCustomReportInput = {
  name: string;
  start_date: string;
  end_date: string;
};

export type UpdateCustomReportInput = Partial<
  Pick<CustomReport, "name" | "start_date" | "end_date">
>;

export const customReportsRepo = {
  /** Returns only is_active=true records */
  getAll(): CustomReport[] {
    return readKey<CustomReport>(KEY).filter((r) => r.is_active);
  },

  getAllIncludingInactive(): CustomReport[] {
    return readKey<CustomReport>(KEY);
  },

  getById(id: string): CustomReport | null {
    return readKey<CustomReport>(KEY).find((r) => r.id === id) ?? null;
  },

  /**
   * Case-insensitive name lookup among active reports.
   * Used for duplicate-name validation.
   */
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

    const updated: CustomReport = {
      ...all[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    all[idx] = updated;
    writeKey(KEY, all);
    return updated;
  },

  softDelete(id: string): void {
    const all = readKey<CustomReport>(KEY);
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`CustomReport not found: ${id}`);

    all[idx] = {
      ...all[idx],
      is_active: false,
      updated_at: new Date().toISOString(),
    };
    writeKey(KEY, all);
  },
};
