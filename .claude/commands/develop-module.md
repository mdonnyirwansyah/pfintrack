---
description: Run the full development pipeline for one module (dev → audit → test). Argument is module name.
argument-hint: <wallet|transactions|loan|report>
---

You are running the **module development pipeline** for module: **$ARGUMENTS**

## ⚠️ Spec Sync Wajib

**Setiap kali agent melakukan perubahan pada kode, dokumen tech spec yang relevan WAJIB langsung diperbarui agar selalu sinkron.** Lakukan dalam turn yang sama dengan perubahan kode — jangan tunda ke step audit.

- Update tabel komponen, route map, schema data, asumsi teknis, atau Known Issues sesuai perubahan
- Bug yang difix → ubah statusnya jadi ✅ FIXED dengan tanggal
- Fitur/file/komponen baru → tambahkan section/baris baru
- Sumber kebenaran tetap codebase — kalau spec dan kode konflik, ikuti kode

## Code Standards Wajib

Setiap kode baru atau perubahan **harus** mengikuti standar ini agar lulus TypeScript, ESLint, dan SonarQube quality gate:

1. **`Number.*` & `replaceAll`** — Gunakan `Number.isNaN`, `Number.parseInt`, `Number.parseFloat`, dan `.replaceAll()`. Dilarang: `isNaN()`, `parseInt()`, `parseFloat()`, `.replace(/regex/g,)`.
2. **Props `Readonly`** — Semua inline props type wajib `Readonly<{...}>`.
3. **Hooks sebelum early return** — `useMemo`, `useCallback`, `useState`, dll tidak boleh setelah `if (...) return null`.
4. **Jangan akses `ref.current` saat render** — Simpan ke state, update bersamaan saat ref di-set.
5. **Backdrop/overlay interaktif** — Gunakan `<button type="button">`, bukan `<div role="button">`.
6. **Context value** — Wajib `useMemo` agar object tidak berubah tiap render.
7. **Cognitive complexity ≤ 15** — Extract sub-component atau helper jika function terlalu panjang/bercabang.
8. **Array key** — Jangan pakai index mentah. Gunakan prefix (`key={\`item-${i}\`}`) atau ID stabil. Tambah `// NOSONAR` jika tidak ada pilihan lain.
9. **Form amount handler baru** — Jika ada pola amount formatting serupa, tambahkan file ke `sonar.cpd.exclusions` di `sonar-project.properties`.

## Pre-flight
1. Verify scaffold exists (`/components/shared/`, `/lib/storage/`). If not, run `scaffold-architect` and `storage-layer-engineer` agents first.
2. Confirm with user: "About to run pipeline for **$ARGUMENTS**. Proceed?"

## Pipeline (sequential)

### Step 1 — Develop
Spawn `module-$ARGUMENTS-dev` agent. Wait for completion.

### Step 2 — Spec Compliance
Spawn `spec-compliance-auditor` (read-only). If gaps found, loop back to module dev with the gap list.

### Step 3 — Migration Readiness
Spawn `migration-readiness-checker`. If blockers, loop back.

### Step 4 — Data Consistency (if module touches wallet.balance)
Skip for `report`. Otherwise spawn `data-consistency-auditor`. If issues, loop back.

### Step 5 — i18n & Format
Spawn `i18n-format-validator`. Loop back if violations.

### Step 6 — Mobile UI Test
Spawn `mobile-ui-tester` for the module's routes only.

### Step 7 — Report
Summarize: routes built, audits passed/failed, screenshots captured.

## Loop Limit
Maximum 3 dev↔audit cycles per module. After that, surface remaining issues to user for decision.
