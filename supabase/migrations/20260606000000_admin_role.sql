-- =============================================
-- 20260606000000_admin_role.sql
-- Add is_admin flag to profiles + RLS for admin console
-- =============================================

-- 1) Add is_admin column (nullable for back-compat, default false)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2) Index for fast admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin)
  WHERE is_admin = true;

-- 3) Helper: is the current auth user an admin?
-- SECURITY DEFINER is required so policies can read is_admin without infinite recursion.
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 4) RLS: admins can update any profile (used to flag, ban, grant admin)
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 5) RLS: admins can read all rows in core operational tables
--    (we already allow self reads; we add admin-everywhere SELECTs)

-- product_reviews: admins can see all
DROP POLICY IF EXISTS "reviews_admin_read" ON public.product_reviews;
CREATE POLICY "reviews_admin_read" ON public.product_reviews
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- products: allow admin write (insert/update/delete)
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- risk_events: admins can write
DROP POLICY IF EXISTS "risk_events_admin_write" ON public.risk_events;
CREATE POLICY "risk_events_admin_write" ON public.risk_events
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- user_behavior_log: admins can read all (per existing comment in initial schema)
DROP POLICY IF EXISTS "behavior_admin_read" ON public.user_behavior_log;
CREATE POLICY "behavior_admin_read" ON public.user_behavior_log
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- notifications: admins can write (broadcast/system notifications)
DROP POLICY IF EXISTS "notifications_admin_write" ON public.notifications;
CREATE POLICY "notifications_admin_write" ON public.notifications
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR profile_id = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR profile_id = auth.uid());
