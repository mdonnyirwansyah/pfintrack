---
description: Run the full development pipeline for one module (dev → audit → test). Argument is module name.
argument-hint: <wallet|transactions|loan|report>
---

You are running the **module development pipeline** for module: **$ARGUMENTS**

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
