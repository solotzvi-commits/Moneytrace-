# MONEYTRACE architecture map

## Runtime layers

- `app.js`: transaction workspace, core navigation, Supabase session and personal transaction sync.
- `js/runtime/`: runtime orchestration and on-demand feature loading.
- `profile-settings.js`, `moneytrace-4.0-security.js`, `moneytrace-security-center.js`: account preferences, recovery and security settings.
- `business-*.js`: business workspace and accounting primitives.
- `moneytrace-intelligence*.js`: local financial analysis core and presentation.
- `features.js`, `moneytrace-six-features.js`, `smart-subscriptions.js`, `coach-2.2.js`: optional personal features.
- `tests/`: Node.js regression tests.
- `.github/workflows/`: CI, security scanning and Pages deployment.
- `supabase/`: database migrations and server-side policy definitions.

## Loading policy

The HTML entry point should load only the app shell, authentication, preferences/security and the runtime loader. Optional feature bundles are loaded once, on first navigation to the relevant view. PDF.js is loaded only after the user selects a PDF file. The service worker precaches only critical startup assets; feature bundles are cached after first use.

## Migration policy

The repository began as a flat-file vanilla JavaScript app. Existing root-level modules are kept in place for now to avoid breaking relative imports, PWA paths, tests and deployment. New runtime code belongs in descriptive folders. Move legacy modules in small batches only when all references, service-worker paths, test paths and deployment output are updated together.

## Authentication

Supabase Auth is the identity provider. Google OAuth is initiated by the client, but provider credentials and redirect allowlists must be configured in the Supabase and Google Cloud dashboards. Authorization and row isolation remain server-enforced by RLS; a successful OAuth login does not replace database policy checks.
