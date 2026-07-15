# Phase 7G — Tuition & evaluation API performance

Build: `20phase7g-tuition-evaluation-api-fast`

## Changes

- Added `POST /api/tuition/status/bulk` for one-request class/global tuition message updates.
- Class and filtered-list tuition send actions now skip rows already marked sent.
- Tuition state loads only the student fields required for billing calculations.
- Historical unpaid tuition rows are scoped to students in the selected month and filtered to rows that can contribute debt.
- Tuition snapshots are compacted before storage to reduce long-term JSON growth.
- Evaluation save reads student and existing monthly evaluation metadata in one query.
- Added focused Supabase indexes for unpaid tuition history and monthly evaluation reads.

## Migration

Run `supabase/migrations/20260715_phase7g_tuition_evaluation_indexes.sql` once.
