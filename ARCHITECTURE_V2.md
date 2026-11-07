# MONEYTRACE Architecture v2

## Objective
Modernize incrementally without replacing the current application in one risky release. The existing vanilla-JavaScript app remains the production entry point while typed domain modules are introduced behind stable boundaries.

## Current-state constraints
- `index.html` loads ordered scripts; script order is runtime behavior.
- Personal finance and Business Mode currently use different persistence paths. Business Mode remains local-device storage; the accounting Supabase migration is not wired to its UI.
- Existing data formats and localStorage keys remain backward compatible until a separately tested migration exists.
- A passing build or static scan is not proof of accounting correctness, tenant isolation, or production security.

## Target layers
1. **Presentation** — screens, accessible reusable components, navigation and responsive layout.
2. **Application** — use cases such as create transaction, detect subscription, post journal entry and export report.
3. **Domain** — framework-independent financial types, validation and deterministic calculations.
4. **Infrastructure** — Supabase repositories, local persistence adapters, imports/exports and external services.

Dependencies point inward: presentation -> application -> domain. Infrastructure implements application/domain ports. Domain code must not import browser globals, Supabase, or UI libraries.

## Incremental migration rules
- Do not delete or rewrite legacy scripts as part of scaffolding.
- Move one feature at a time, retaining a compatibility adapter until parity tests pass.
- Never change existing storage keys or silently transform user data.
- Add tests for old and new behavior before switching a feature's entry point.
- Keep secrets on the server. Enforce authorization with database RLS and server-side checks.
- Keep accounting entries immutable after posting; corrections use linked reversals and audit events.
- Treat reports as management information until reviewed for local statutory requirements.

## Initial structure
```
src/
  domain/
    finance/transaction.ts
    accounting/journal.ts
  application/
  infrastructure/
  presentation/
  shared/
tests/
  (existing Node tests remain in place)
```

## Delivery sequence
1. Tooling and typed domain contracts (this change).
2. Add parity tests and extract transaction/subscription logic behind domain functions.
3. Extract accounting rules and connect the UI through an application service.
4. Introduce repository interfaces and a tested local-storage adapter; then connect Supabase with tenant/RLS tests.
5. Build reusable design tokens/components and migrate screens incrementally.
6. Add end-to-end, accessibility, backup/restore, authorization and deployment checks before production use.

## Non-goals of this first step
This change does not switch the live UI to React, alter stored data, connect business records to Supabase, or claim production readiness. Those require separate reviewable steps.
