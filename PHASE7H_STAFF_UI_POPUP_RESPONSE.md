# Phase 7H — Staff UI & Popup Response

Build: `20phase7h-staff-ui-popup-response`

## Changes
- Compact Teacher/TA/Manager/Admin/Receptionist cards.
- Removed repeated role instructions and receptionist tuition notes from the staff UI.
- Added local search, role filter, and account-status filter.
- Staff modals use a compact width with sticky header/footer.
- Inline validation for name, phone/account, and email.
- Warn before closing a staff form with unsaved changes.
- Per-action locks prevent duplicate create/save/reset/assign/remove/delete requests.
- Assign/remove class updates the existing popup and staff card without reopening the modal.
- Save updates the relevant card, counters, status, and popup directly.
- Staff deletion uses an in-app confirmation layer without replacing the detail popup.

## Database
No new migration is required.

## Verification
- JavaScript syntax check: passed.
- Next.js production build and TypeScript check: passed.
- DOM integration harness: 28/28 checks passed.
