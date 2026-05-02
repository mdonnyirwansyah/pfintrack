"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { useReportStore } from "@/lib/stores/useReportStore";
import { formatDisplayDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";

interface FormErrors {
  name?: string;
  start_date?: string;
  end_date?: string;
}

function getDefaultStartDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function getDefaultEndDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const MAX_RANGE_DAYS = 10 * 365 + 3; // ~10 years including leap years

export default function AddCustomReportPage() {
  const router = useRouter();
  const { createCustomReport, loadCustomReports, isNameTaken } =
    useReportStore();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCustomReports();
    nameRef.current?.focus();
  }, [loadCustomReports]);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    const trimmed = name.trim();

    if (!trimmed) {
      errs.name = "Report name is required";
    } else if (trimmed.length < 2) {
      errs.name = "Name must be at least 2 characters";
    } else if (trimmed.length > 50) {
      errs.name = "Name must be at most 50 characters";
    } else if (isNameTaken(trimmed)) {
      errs.name = "Report name is already used";
    }

    if (!startDate) {
      errs.start_date = "Start date is required";
    }
    if (!endDate) {
      errs.end_date = "End date is required";
    }

    if (startDate && endDate) {
      if (endDate < startDate) {
        errs.end_date = "End date must be after start date";
      } else {
        const diffMs =
          new Date(endDate).getTime() - new Date(startDate).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > MAX_RANGE_DAYS) {
          errs.end_date = "Range must not exceed 10 years";
        }
      }
    }

    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    try {
      createCustomReport({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
      });
      router.back();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader title="Add Report" showBack />

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-5">
        {/* Report Name */}
        <div className="space-y-1.5">
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--text-secondary)" }}
            htmlFor="report-name"
          >
            Report Name
          </label>
          <input
            ref={nameRef}
            id="report-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder="Enter the report name"
            className="w-full rounded-[12px] px-4 text-[15px] outline-none transition-all border"
            style={{
              minHeight: "var(--tap-target-min)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              borderColor: errors.name
                ? "var(--color-negative)"
                : "var(--border-default)",
            }}
            maxLength={50}
            autoComplete="off"
          />
          {errors.name && (
            <p
              className="text-[12px]"
              style={{ color: "var(--color-negative)" }}
            >
              {errors.name}
            </p>
          )}
        </div>

        {/* Start Date */}
        <div className="space-y-1.5">
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--text-secondary)" }}
            htmlFor="start-date"
          >
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (errors.start_date)
                setErrors((p) => ({ ...p, start_date: undefined }));
            }}
            className="w-full rounded-[12px] px-4 text-[15px] outline-none transition-all border appearance-none"
            style={{
              minHeight: "var(--tap-target-min)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              borderColor: errors.start_date
                ? "var(--color-negative)"
                : "var(--border-default)",
            }}
          />
          {startDate && (
            <p
              className="text-[12px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {formatDisplayDate(startDate)}
            </p>
          )}
          {errors.start_date && (
            <p
              className="text-[12px]"
              style={{ color: "var(--color-negative)" }}
            >
              {errors.start_date}
            </p>
          )}
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--text-secondary)" }}
            htmlFor="end-date"
          >
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              if (errors.end_date)
                setErrors((p) => ({ ...p, end_date: undefined }));
            }}
            className="w-full rounded-[12px] px-4 text-[15px] outline-none transition-all border appearance-none"
            style={{
              minHeight: "var(--tap-target-min)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              borderColor: errors.end_date
                ? "var(--color-negative)"
                : "var(--border-default)",
            }}
          />
          {endDate && (
            <p
              className="text-[12px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {formatDisplayDate(endDate)}
            </p>
          )}
          {errors.end_date && (
            <p
              className="text-[12px]"
              style={{ color: "var(--color-negative)" }}
            >
              {errors.end_date}
            </p>
          )}
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-[12px] px-8 text-[15px] font-semibold transition-opacity disabled:opacity-60"
            style={{
              minHeight: "var(--tap-target-min)",
              backgroundColor: "var(--color-brand)",
              color: "var(--text-on-primary)",
            }}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </>
  );
}
