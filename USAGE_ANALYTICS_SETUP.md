# MONEYTRACE Usage Analytics — setup

## 1. Create the analytics table
1. Open the Supabase project connected to MONEYTRACE.
2. Go to **SQL Editor** and create a new query.
3. Paste and run the complete contents of `supabase/usage-analytics.sql`.
4. Confirm that `public.app_usage_events` exists and RLS is enabled.

## 2. Grant the owner account admin access
In Supabase Dashboard, open **Authentication → Users**, select the account that should administer MONEYTRACE, and edit its **App Metadata** (not User Metadata) to include:

```json
{ "role": "admin" }
```

Save the change, then sign out and sign back in to MONEYTRACE so the refreshed JWT contains the new app_metadata claim. Never put a service-role key in browser code.

## 3. Verify
- Sign in as a normal user: the **נתוני שימוש** navigation item must remain hidden.
- Sign in as the admin: open **נתוני שימוש**. The dashboard should load aggregate counts from real events.
- Create a test transaction and navigate between sections. Only event type, feature name (for feature views), user UUID, and timestamp are stored.
- The analytics table deliberately excludes transaction descriptions, amounts, account emails, and other financial data.

## Notes
- Analytics covers authenticated users only.
- App opens are deduplicated once per account/browser per 24 hours.
- Admin read access is enforced by Supabase Row Level Security, not only by hiding the UI.
