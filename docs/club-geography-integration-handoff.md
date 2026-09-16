# Club geography integration handoff

## Verified integration scope

- The integration is based on `main` after the five-country catalog update; the
  FR, ES, CH, SI and PL catalog migration and tests remain unchanged.
- Web and bearer-token (Mobile) clients use the same authenticated
  `GET/PATCH /api/profiles/me/residence` contract.
- Player and Staff still require the existing UI flag, write kill switch and
  per-user allowlist. Club reads and writes do not depend on those rollout
  flags.
- Club writes call `update_my_club_geography(uuid, uuid)` only. There is no
  fallback to independent `profiles` / `profile_preferences` writes: an RPC
  error is returned to the caller so the database transaction remains the
  single owner of country reconciliation and history.
- Ownership is not accepted in the request body. Authentication supplies the
  database session and the RPC derives the Club from `auth.uid()`.

## Production release (manual, no automatic merge/deploy)

1. Review and merge this PR manually after required checks pass.
2. Before deploying, run a **read-only** Production preflight confirming that
   `public.update_my_club_geography(uuid, uuid)` exists, is executable by the
   authenticated application role, resolves ownership through `auth.uid()`,
   and contains the expected country-change/history transaction.
3. Confirm Supabase migration history already records
   `20261221120000_club_geography_reconcile_country_records` as applied. The RPC
   has already been observed in Production: **do not execute that migration or
   recreate the function in Production**. If repository and remote migration
   histories differ, reconcile the migration ledger through the approved DBA
   procedure rather than running the SQL again.
4. Deploy the application commit without changing any global residence feature
   flags.
5. Smoke-test with dedicated accounts:
   - Club `GET` returns `enabled: true`, `writable: true` with the canonical IDs;
   - Club `PATCH` succeeds for its own geography with both cookie and bearer
     authentication;
   - a country change reconciles registrations/history atomically;
   - an intentionally rejected RPC leaves canonical, legacy and history rows
     unchanged and returns a non-2xx response;
   - Player/Staff outside the existing gates remain blocked;
   - another Club's identifier cannot be supplied or modified.
6. Monitor API error rate and the database function logs. Roll back the Web
   application commit if needed; do not compensate with direct table writes.

