-- Optimize stable auth helper calls in RLS policies.
-- Wrapping auth.uid()/auth.jwt() in scalar SELECTs lets Postgres evaluate
-- them once per statement (initPlan) rather than once per candidate row.
-- All roles, commands, permissive modes, and ownership predicates are preserved.

DROP POLICY "Admins read analytics events" ON public.app_usage_events;
CREATE POLICY "Admins read analytics events"
ON public.app_usage_events
AS PERMISSIVE FOR SELECT TO authenticated
USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY "Users insert own analytics events" ON public.app_usage_events;
CREATE POLICY "Users insert own analytics events"
ON public.app_usage_events
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions"
ON public.transactions
AS PERMISSIVE FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions"
ON public.transactions
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions"
ON public.transactions
AS PERMISSIVE FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
ON public.transactions
AS PERMISSIVE FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY "Users can insert own financial settings" ON public.user_financial_settings;
CREATE POLICY "Users can insert own financial settings"
ON public.user_financial_settings
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY "Users can read own financial settings" ON public.user_financial_settings;
CREATE POLICY "Users can read own financial settings"
ON public.user_financial_settings
AS PERMISSIVE FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY "Users can update own financial settings" ON public.user_financial_settings;
CREATE POLICY "Users can update own financial settings"
ON public.user_financial_settings
AS PERMISSIVE FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
