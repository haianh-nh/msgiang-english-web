# Phase 7 — Mid-month student tuition

This release keeps one monthly invoice and adds a carried tuition adjustment for students who join during a month.

## Flow

1. Admin/Manager opens a class and adds a student.
2. The app previews the valid regular class sessions from the chosen first session to the end of the source month.
3. Cancelled center sessions are excluded from the preview.
4. Student creation and adjustment creation are committed in one database transaction.
5. The source month is not billed as a separate invoice.
6. The target month invoice contains regular tuition plus a separate carried adjustment line.

## Safety

- Migration: `020_midmonth_enrollment_tuition_adjustments.sql`
- RPC: `official_add_student_with_prorated_tuition`
- Adjustment states: `pending`, `included`, `cancelled`
- Sent/paid invoices lock the adjustment from editing.
- Cancelling an adjustment also cancels any matching tuition credits created for cancelled sessions.
- The tuition API loads independent data in parallel and returns `Server-Timing`.
- Existing Phase 6 Realtime continues to invalidate tuition state across devices.

## Build marker

`20phase7tuition`
