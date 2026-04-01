-- Enable RLS on model_registry (only table missing it)
-- model_registry is a read-only catalog managed by admins via service role.
-- Authenticated users can SELECT; INSERT/UPDATE/DELETE blocked for all roles.

ALTER TABLE public.model_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view model registry"
  ON public.model_registry
  FOR SELECT
  TO authenticated
  USING (true);
