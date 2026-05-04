# PFinTrack — Panduan AI Workflow

Panduan praktis cara memakai infrastruktur Claude Code yang sudah disiapkan di project ini agar setiap pekerjaan (fitur baru, bug fix, penyesuaian, deploy) berjalan **efektif** dan **konsisten dengan tech-spec**.

---

## 📋 Daftar Isi

1. [Cheat Sheet — Apa yang Diketik Kapan](#cheat-sheet)
2. [Arsitektur Workflow](#arsitektur)
3. [Playbook — Skenario Sehari-hari](#playbook)
   - [Tambah fitur baru](#playbook-fitur-baru)
   - [Bug fix / penyesuaian UI kecil](#playbook-bugfix)
   - [Penyesuaian fitur existing](#playbook-adjust)
   - [Refactor lintas modul](#playbook-refactor)
   - [Pre-commit / pre-deploy](#playbook-deploy)
4. [Anti-pattern — Hindari Ini](#anti-pattern)
5. [Tips Efisiensi](#tips)

---

<a name="cheat-sheet"></a>
## 1. Cheat Sheet — Apa yang Diketik Kapan

| Kebutuhan | Yang Diketik | Apa yang Terjadi |
|---|---|---|
| Brainstorm fitur baru / research / proposal | Spawn `feature-architect` | Discovery → research → analisa → proposal di `tech-spec-docs/proposals/` |
| Tulis / update tech-spec | Spawn `system-analyst` | Translate proposal → spec, sync spec ke codebase, bump versi |
| Tambah modul baru (butuh agent baru) | Spawn `agent-bootstrapper` | Scaffold `module-<name>-dev` agent + update `/develop-module` + AI_WORKFLOW |
| Bug fix / UI tweak | Langsung deskripsikan masalahnya, atau spawn `bugfix-adjuster` | Edit langsung dengan invariant guard |
| Cek implementasi vs spec | `/audit-spec` | Read-only diff vs `tech-spec-docs/` |
| Cek skema localStorage masih cocok untuk Fase 2 | `/check-migration-ready` | Validasi 1:1 dengan DB schema masa depan |
| Screenshot mobile multi-viewport | `/preview-mobile /route` | Screenshot 375/390/430 px |
| Build modul lengkap dari nol | `/develop-module wallet\|transactions\|loan\|report` | Pipeline dev → audit → test |
| Deploy production | `/ship-it` | Validasi penuh + deploy |
| Cari section di tech-spec | invoke skill `pfintrack-spec-lookup` | Grep cepat tanpa baca seluruh file |
| Cek aturan format Rupiah/tanggal | invoke skill `id-locale-formatter` | Reference rules id-ID |
| Cek aturan wallet.balance side-effect | invoke skill `wallet-balance-trace` | Tabel apply/rollback |

---

<a name="arsitektur"></a>
## 2. Arsitektur Workflow

Project ini punya **3 lapisan AI**:

```
┌─────────────────────────────────────────────────────────────────┐
│  SLASH COMMANDS — orchestration layer                           │
│  /develop-module · /audit-spec · /check-migration-ready         │
│  /preview-mobile · /ship-it                                     │
│  → Memanggil agents dalam urutan tertentu                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓ spawn
┌─────────────────────────────────────────────────────────────────┐
│  AGENTS — execution layer (13 agents)                           │
│                                                                  │
│  ┌─ Thinking & docs agents ────────────────────────────┐        │
│  │  feature-architect ⭐ (research/design → proposals) │        │
│  │  system-analyst ⭐    (write/maintain tech-spec)     │        │
│  │  agent-bootstrapper ⭐ (scaffold new agents)         │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌─ Builder agents (write code) ──────────────────────┐        │
│  │  scaffold-architect    storage-layer-engineer       │        │
│  │  module-wallet-dev     module-transactions-dev     │        │
│  │  module-loan-dev       module-report-dev           │        │
│  │  bugfix-adjuster ⭐    deploy-orchestrator          │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌─ Auditor agents (read-only) ───────────────────────┐        │
│  │  spec-compliance-auditor      data-consistency-...  │        │
│  │  i18n-format-validator        migration-readiness-..│        │
│  │  mobile-ui-tester                                   │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              ↓ reference
┌─────────────────────────────────────────────────────────────────┐
│  SKILLS — knowledge layer (6 skills)                            │
│  pfintrack-spec-lookup   id-locale-formatter                    │
│  localstorage-schema-validator    wallet-balance-trace          │
│  migration-fase2-diff    route-coverage-check                   │
│  → Reference cards untuk aturan & schema                        │
└─────────────────────────────────────────────────────────────────┘
```

**Hooks aktif** (di `.claude/settings.json`):
- Edit/Write file di `lib/storage/` → reminder `/check-migration-ready`
- Edit/Write di `app/` → reminder cek route map spec
- Prompt mengandung "deploy/release/ship" → tampilkan pre-deploy checklist
- Stop dengan ada perubahan modul → reminder `/audit-spec` sebelum commit

---

<a name="playbook"></a>
## 3. Playbook — Skenario Sehari-hari

<a name="playbook-fitur-baru"></a>
### 3.1 Tambah Fitur Baru

#### A0. Ide masih kasar — perlu didiskusikan dulu (RECOMMENDED untuk fitur besar)

**Rantai 4-stage end-to-end** (ide → proposal → spec → kode):

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ 1. Brainstorm│ → │ 2. Spec     │ → │ 3. Implement │ → │ 4. Audit     │
│ feature-     │   │ system-      │   │ module-*-dev │   │ /audit-spec  │
│ architect    │   │ analyst      │   │ atau bugfix- │   │              │
│              │   │              │   │ adjuster     │   │              │
│ → PROP-NNNN  │   │ → tech-spec  │   │ → src/**/*   │   │ → ✅ konsisten│
│   .md        │   │   updated    │   │              │   │              │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
   THINKING           DOCUMENTING         BUILDING          VERIFYING
```

**Step-by-step:**

```
1. Brainstorm — spawn feature-architect:
   "Saya kepikiran fitur recurring transaction. Belum tahu
    detail desain & impact-nya. Tolong dianalisa dan dibuatkan
    proposal."

   → Output: tech-spec-docs/proposals/PROP-NNNN-recurring-transactions.md
   → Iterate sampai status: Accepted

2. Update spec — spawn system-analyst:
   "PROP-0003 di-accept. Tolong update tech-spec-docs sesuai proposal."

   → Output: tech-spec-module-transactions.md (versi bump)
            + tech-spec-global-architecture.md (jika cross-cutting)
            + revision history entry
            + diff summary

3. Implementasi — spawn module-transactions-dev:
   "Implementasi fitur recurring transaction sesuai
    tech-spec-module-transactions.md §X.Y yang baru."

   → Output: src/** code changes

4. Audit — jalankan command:
   /audit-spec
   → Verifikasi codebase ≡ spec
```

**Kunci dari rantai ini:** spec selalu **diupdate dulu sebelum kode**. Jangan implementasi → baru update spec — itu pola yang menyebabkan spec basi & inkonsisten.

**Kapan pakai feature-architect vs langsung minta implementasi?**

| Kondisi | Pakai feature-architect? |
|---|---|
| Ide nyentuh ≥2 modul | ✅ Ya |
| Perlu key/field baru di localStorage | ✅ Ya |
| Belum yakin pendekatan terbaiknya | ✅ Ya |
| Mau bandingkan dengan competitor | ✅ Ya |
| Cuma tambah field/tombol di 1 modul | ❌ Langsung saja |
| Bug fix murni | ❌ Pakai bugfix-adjuster |

#### A. Fitur kecil di modul existing (mis. tambah field, tambah tombol)

```
1. Saya ke Claude:
   "Tambah field XYZ di form Wallet. Validasi: ...
    Spec sudah update di tech-spec-module-wallet.md."

2. Claude akan:
   - Baca section relevan di tech-spec via skill pfintrack-spec-lookup
   - Edit komponen + types + storage repo seperlunya
   - Jalankan `npx tsc --noEmit`

3. Saya jalankan: /audit-spec
   → Pastikan tidak ada gap dengan spec

4. Jika nyentuh wallet.balance:
   → Spawn data-consistency-auditor
```

#### B. Fitur baru lintas modul (mis. integrasi Loan ↔ Wallet baru)

```
1. UPDATE TECH-SPEC DULU di tech-spec-docs/
   (ini sumber kebenaran — codebase mengikuti)

2. Minta Claude implementasi sambil rujuk spec:
   "Implementasi fitur X sesuai tech-spec-module-loan.md §2.5
    yang baru. Pastikan side-effect ke wallet.balance ikut spec
    global §6.3."

3. Setelah implementasi:
   /audit-spec
   /check-migration-ready    (jika nyentuh schema)
   Spawn data-consistency-auditor (jika nyentuh wallet.balance)
   Spawn i18n-format-validator (jika nampilkan angka/tanggal)
```

#### C. Modul baru dari nol (jarang — sudah ada 4 modul)

⚠️ **Penting**: untuk modul baru, command `/develop-module <nama>` butuh agent `module-<nama>-dev` yang **belum ada**. Harus di-scaffold dulu.

**Rantai 5-stage end-to-end** untuk modul baru:

```
1. Brainstorm — feature-architect
   "Saya pertimbangkan tambah modul Budget. Tolong proposal."
   → PROP-NNNN-budget-module.md (status: Accepted)

2. Spec — system-analyst
   "PROP-NNNN accepted. Buat tech-spec-module-budget.md dan
    update global spec untuk routes + localStorage key baru."
   → tech-spec-module-budget.md (versi 1.0)
   → tech-spec-global-architecture.md (bump minor)

3. Scaffold agent — agent-bootstrapper
   "Spec modul Budget sudah siap. Scaffold module-budget-dev agent."
   → .claude/agents/module-budget-dev.md (NEW)
   → .claude/commands/develop-module.md (argument-hint extended)
   → AI_WORKFLOW.md (mention modul baru)

4. Implementasi — sekarang command sudah jalan:
   /develop-module budget
   → Pipeline 7-step: dev → spec audit → migration → consistency
                      → i18n → mobile UI test → report

5. Verifikasi akhir
   /audit-spec
   /check-migration-ready
```

**Kenapa agent-bootstrapper perlu?**
Setiap modul punya `module-<nama>-dev` agent terpisah karena:
- Setiap agent baca tech-spec modul-nya saat spawn (lebih fokus)
- Constraint per modul beda (mis. wallet boleh tulis ke wallet_balance_history, transactions tidak)
- Out-of-scope per modul mencegah agent menulis di luar tanggung jawabnya

Jadi 1 modul baru = 1 agent baru. agent-bootstrapper otomatisasi pembuatannya.

---

<a name="playbook-bugfix"></a>
### 3.2 Bug Fix atau UI Tweak Kecil

**Ini skenario paling sering** — gunakan **`bugfix-adjuster`** agent.

```
1. Saya ke Claude:
   "Di form Loan, label wallet masih 'optional' padahal
    sekarang wajib. Perbaiki + cek copy bahasa Indonesia-nya."

2. Claude (atau spawn bugfix-adjuster) akan:
   - Baca file relevan
   - Baca invariant di .claude/agents/bugfix-adjuster.md
   - Edit minimal
   - `npx tsc --noEmit`

3. Verifikasi:
   - Jika UI: /preview-mobile /loan/add/give
   - Jika logic data: spawn data-consistency-auditor
```

**Kapan langsung ke Claude vs spawn `bugfix-adjuster`?**

| Skenario | Approach |
|---|---|
| Edit 1-2 file, jelas masalahnya | Langsung minta Claude — lebih cepat |
| Bug bisa nyebar ke beberapa file/modul | `bugfix-adjuster` — agent punya checklist invariant |
| Bug terkait wallet.balance / Balance Correction | `bugfix-adjuster` + lalu `data-consistency-auditor` |
| Bug terkait format angka/tanggal | `bugfix-adjuster` + lalu `i18n-format-validator` |

---

<a name="playbook-adjust"></a>
### 3.3 Penyesuaian Fitur Existing

Misal: "ubah urutan field di form Loan" atau "tambah simbol minus di expenses".

```
1. Saya ke Claude (deskripsikan dengan jelas):
   "Di Report Monthly tab, baris Expenses kasih warna merah
    + prefix '-' kalau nilainya > 0."

2. Claude akan edit komponen yang relevan.

3. Jika perubahannya signifikan / lintas modul:
   → SPAWN system-analyst untuk update spec:
     "Update tech-spec-module-report.md: baris Expenses
      sekarang merah dengan prefix '-'. Sinkronkan."

4. Verifikasi:
   /audit-spec   ← ini guard utama bahwa codebase ≡ spec
```

**Aturan emas**: setiap penyesuaian yang mengubah **kontrak modul** (perilaku yang dilihat user / dipakai modul lain) **wajib** update tech-spec di sesi yang sama. Jangan biarkan spec basi.

**Kapan pakai `system-analyst` vs minta Claude langsung edit spec?**

| Skenario | Approach |
|---|---|
| Perubahan single-file, single-section, jelas | Claude langsung edit (lebih cepat) |
| Lintas modul / butuh sync ke beberapa file spec | `system-analyst` (paham cross-impact) |
| Translate accepted proposal → spec | `system-analyst` (mode 1) |
| Spec drift dari codebase, perlu sync | `system-analyst` (mode 2: jalankan git diff dulu) |
| Cek konsistensi antar 5 file spec | `system-analyst` (mode 4: audit konsistensi) |

---

<a name="playbook-refactor"></a>
### 3.4 Refactor Lintas Modul

Misal: ganti pola state, restructure storage repo, dll.

```
1. Diskusi pendekatan dulu dengan Claude (jangan langsung implementasi).
   "Saya mau pisahkan logic Balance Correction ke helper
    terpisah. Apa konsekuensinya ke 4 modul?"

2. Setelah deal pendekatan:
   - Update tech-spec dulu jika perlu
   - Implementasi step by step
   - Test setiap step

3. Validasi penuh setelah refactor:
   /audit-spec
   /check-migration-ready
   Spawn data-consistency-auditor
   Spawn i18n-format-validator
   /preview-mobile /transactions   (smoke test UI)
```

---

<a name="playbook-deploy"></a>
### 3.5 Pre-commit / Pre-deploy

#### Sebelum commit

```bash
npx tsc --noEmit          # cek tipe
/audit-spec               # codebase ≡ spec?
```

Hooks `Stop` otomatis ngingetin `/audit-spec` kalau ada perubahan modul.

#### Sebelum push ke main

```
/audit-spec
/check-migration-ready
```

#### Pre-deploy production

```
/ship-it
   → Step 1: konfirmasi target (Vercel/Netlify/Cloudflare)
   → Step 2: 4 auditor parallel
   → Step 3: typecheck + lint + build + bundle size + smoke test
   → Step 4: deploy via deploy-orchestrator (konfirmasi lagi)
   → Step 5: verifikasi URL hidup
```

---

<a name="anti-pattern"></a>
## 4. Anti-pattern — Hindari Ini

| ❌ Jangan | ✅ Sebagai gantinya |
|---|---|
| Edit langsung tanpa baca spec | Tanya `pfintrack-spec-lookup` skill / baca section relevan dulu |
| Implementasi fitur lalu lupa update tech-spec | Update spec di **sesi yang sama** dengan implementasi |
| Tulis ke `wallet_balance_history` dari modul Transactions/Loan | Hanya boleh dari Wallet module (manual edit). Lihat `wallet-balance-trace` skill |
| Hardcode `Rp` atau pakai `.toLocaleString()` langsung | Selalu pakai `formatIDR()` / `parseIDR()` dari `lib/format/number.ts` |
| Pakai `formatDisplayDate(date)` tanpa locale | Pakai `formatDisplayDate(date, useLocale())` di client component |
| Permanent delete record | Soft delete: set `is_active = false` |
| Tambah key localStorage baru | Hanya 7 key allowed (lihat CLAUDE.md). Jika perlu key ke-8, **update spec dulu** |
| Skip TypeScript check setelah edit | Selalu `npx tsc --noEmit` minimal sebelum commit |
| Deploy tanpa `/ship-it` | Pipeline-nya mengamankan: spec, schema, consistency, build, smoke test |

---

<a name="tips"></a>
## 5. Tips Efisiensi

### 5.1 Pola prompt yang efektif

**❌ Buruk:**
> "Perbaiki form loan"

**✅ Bagus:**
> "Di form Loan Add Give, label 'Wallet (optional)' harus jadi 'Wallet' (wajib). Validasi error 'Pilih dompet terlebih dahulu' jika kosong saat submit. Update juga `tech-spec-module-loan.md` sesuai perubahan ini."

Kunci: **lokasi spesifik + behavior eksplisit + ingat update spec**.

### 5.2 Parallelisasi auditor

Auditor agents itu **read-only** dan **independen** satu sama lain. Saat mau validasi cepat, minta Claude jalankan paralel:

> "Spawn paralel: spec-compliance-auditor, i18n-format-validator, dan data-consistency-auditor. Laporkan ringkas."

Vs sequential — bisa hemat 60-70% waktu.

### 5.3 Skill > baca spec full

Spec docs ukurannya 27-34 KB per file. Jangan minta Claude baca seluruh file kalau cuma butuh 1 section.

> ❌ "Baca tech-spec-module-wallet.md"
> ✅ "Pakai skill `pfintrack-spec-lookup` cari section 'Edit Wallet flow'"

### 5.4 Manfaatkan sub-agent yang sudah dispesialisasi

Setiap modul dev agent (`module-wallet-dev`, dll) sudah baca tech-spec modulnya saat spawn. Kalau kerjaan terlokalisasi di satu modul, **spawn agent itu langsung**, lebih fokus daripada Claude main yang harus context-switch.

### 5.5 Iterasi → audit → iterasi

Setiap kali selesai chunk implementasi yang signifikan:
1. `/audit-spec` (cepat, read-only)
2. Fix gap yang muncul
3. Lanjut chunk berikutnya

Jangan tumpuk perubahan baru audit di akhir — gap ke-spec menumpuk dan susah dilacak.

### 5.6 Background task untuk yang lama

Build / deploy / Playwright test bisa lama. Manfaatkan `run_in_background` di Bash atau spawn agent di background. Jangan idle nungguin terminal.

---

## 📂 Lokasi File Penting

```
.claude/
├── agents/                  ← 13 specialized agents
├── commands/                ← 5 slash commands
├── skills/                  ← 6 reference skills
└── settings.json            ← permissions + hooks

tech-spec-docs/              ← SUMBER KEBENARAN
├── tech-spec-global-architecture.md
├── tech-spec-module-wallet.md
├── tech-spec-module-transactions.md
├── tech-spec-module-loan.md
└── tech-spec-module-report.md

CLAUDE.md                    ← project instructions (auto-loaded oleh Claude)
AI_WORKFLOW.md               ← guide ini
```

---

## 🎯 Ringkasan Singkat (Kalau Lupa)

1. **Bug kecil / UI tweak** → langsung minta Claude / spawn `bugfix-adjuster`
2. **Fitur baru besar** → rantai 4-stage:
   - `feature-architect` (proposal)
   - `system-analyst` (spec)
   - `module-*-dev` / `bugfix-adjuster` (kode)
   - `/audit-spec` (verifikasi)
3. **Penyesuaian fitur existing** → implementasi + spawn `system-analyst` untuk sync spec → `/audit-spec`
4. **Modul baru dari nol** → rantai 5-stage:
   - `feature-architect` (proposal)
   - `system-analyst` (spec module + global)
   - `agent-bootstrapper` (scaffold module-dev agent)
   - `/develop-module <nama>` (build)
   - `/audit-spec` (verify)
5. **Mau commit** → `npx tsc --noEmit` + `/audit-spec`
6. **Mau deploy** → `/ship-it`

Setiap perubahan kontrak modul → **wajib update tech-spec di sesi yang sama**. Spec dulu, kode kemudian.

---

*— End of AI Workflow Guide —*
