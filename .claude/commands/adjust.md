---
description: Fix visual inconsistencies, logic errors, UI polish, cross-module behavioral fixes, and small feature adjustments. Argument is a description of the issue.
argument-hint: <deskripsi bug atau adjustment>
---

Spawn `bugfix-adjuster` agent untuk menyelesaikan issue berikut: **$ARGUMENTS**

Brief agent dengan konteks ini:
- Working dir: `/Users/dy/Projects/javascript/pfintrack`
- Issue: $ARGUMENTS
- Setelah fix, wajib update tech-spec yang relevan di `tech-spec-docs/` (jika ada Known Issues yang difix, ubah statusnya jadi ✅ FIXED dengan tanggal hari ini)
- Ikuti code standards: `Number.isNaN`, `Number.parseInt`, `Number.parseFloat`, `.replaceAll()`, props `Readonly<>`, hooks sebelum return, backdrop `<button>` bukan `<div>`
