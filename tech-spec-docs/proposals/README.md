# Feature Proposals

Folder ini menyimpan **proposal fitur baru** yang dihasilkan oleh agent `feature-architect`.

## Naming Convention

```
PROP-NNNN-feature-slug.md
```

- `NNNN` — nomor urut 4 digit, mulai dari `0001`
- `feature-slug` — kebab-case singkat (mis. `recurring-transactions`, `savings-goal-tracker`)

## Status Lifecycle

```
Draft → Under Review → Accepted → (Implemented)
                    ↘ Rejected
                    ↘ Superseded by PROP-XXXX
```

| Status | Arti |
|---|---|
| **Draft** | Baru ditulis, masih dalam diskusi awal |
| **Under Review** | Siap untuk evaluasi mendalam |
| **Accepted** | Disetujui untuk implementasi (siap dispawn ke module-dev agent) |
| **Rejected** | Ditolak — sertakan alasan |
| **Superseded** | Diganti proposal lain — link ke proposal baru |
| **Implemented** | Sudah diimplementasi — link ke commit/PR |

## Cara Pakai

### Membuat proposal baru

Spawn agent `feature-architect` dengan ide kasar:

```
"Saya kepikiran fitur recurring transaction biar tagihan
bulanan kayak listrik gak perlu diinput manual. Tolong
dianalisa dan dibuatkan proposal."
```

Agent akan:
1. Tanya beberapa pertanyaan klarifikasi (Stage 1: Discovery)
2. Research codebase + best practices kompetitor (Stage 2)
3. Analisa 5 dimensi: user value, feasibility, migration impact, design consistency, effort (Stage 3)
4. Tulis proposal di `PROP-NNNN-recurring-transactions.md` (Stage 4)

### Review proposal

Baca proposal, beri feedback, dan iterate:

```
"Untuk PROP-0003, saya prefer Option B tapi worry soal
edge case kalau wallet-nya di-soft-delete. Tolong update
proposalnya sambil pertimbangkan ini."
```

### Approve proposal

Setelah disetujui, ubah status di file ke **Accepted**, lalu hand off ke implementer agent:

```
"PROP-0003 di-accept. Spawn module-transactions-dev untuk
implementasi MVP-nya sesuai roadmap di section 8."
```

## Archive Policy

Setelah proposal **diformalisasi ke tech-spec** (status `Formalized`) atau **ship-ed** ke production, file proposal-nya dihapus dari folder ini agar folder hanya berisi proposal aktif (Draft / Under Review / Accepted yang belum di-implement).

Riwayat lengkap proposal lama tetap accessible via `git log -- tech-spec-docs/proposals/PROP-NNNN-*.md`. Source of truth final = tech-spec dedicated (mis. `tech-spec-feature-faq.md`, `tech-spec-migration-indexeddb.md`).

## Index Proposal Aktif

_(Saat ini kosong — semua proposal sudah formalized ke tech-spec.)_

## Index Proposal yang Sudah Diformalisasi

| ID | Judul | Formalized to | Tanggal |
|---|---|---|---|
| PROP-0001 | Migrate Storage Layer: localStorage → IndexedDB | `tech-spec-migration-indexeddb.md` | 2026-05-14 |
| PROP-0002 | Report Module Enhancements | `tech-spec-module-report.md` §11 | 2026-05-07 |
| PROP-0003 | Color Theme Picker | `tech-spec-global-architecture.md` §3.11 / §4.3 / §6.1 / §11 | 2026-05-16 |
| PROP-0004 | Report Visibility Settings | `tech-spec-global-architecture.md` §11 + `tech-spec-module-report.md` | 2026-05-16 |
| PROP-0005 | In-App FAQ | `tech-spec-feature-faq.md` | 2026-05-16 |

> Saat agent membuat proposal baru, **wajib update tabel "Aktif" di atas**. Saat proposal di-formalisasi, pindahkan ke tabel "Sudah Diformalisasi" dan hapus file proposal-nya.

---

## Tips

- **Jangan langsung implementasi** ide-ide besar. Lewat proposal dulu — biaya berpikir kecil, biaya refactor mahal.
- **Ide kecil & jelas tidak perlu proposal**. Misal "tambah simbol minus di Expenses" → langsung `bugfix-adjuster`. Proposal hanya untuk yang berdampak ke arsitektur / lintas modul / butuh seksi.
- **Multiple options > single recommendation**. Proposal yang bagus menyajikan 2–3 pendekatan dengan tradeoff jelas, bukan satu solusi yang harus diambil.
- **Refer ke proposal yang sudah ada**. Kalau ide baru terkait, jangan duplikasi — link ke yang lama dan extend.

---

*Folder ini dikelola oleh agent `feature-architect`. Lihat `.claude/agents/feature-architect.md` untuk detail.*
