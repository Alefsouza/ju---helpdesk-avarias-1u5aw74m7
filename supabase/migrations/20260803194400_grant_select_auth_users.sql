-- Fix HTTP 403 (permission denied for table users) when deleting from
-- documentos / anexos_chamado / anexos_chamado_interno as ti@viasudeste.com.
--
-- The RLS policies "ti_admin_delete_*" query auth.users to verify the caller's
-- email, but the `authenticated` role lacked SELECT on auth.users.
-- Grant the minimal privilege needed so the DELETE policies can resolve the
-- email lookup without granting write access.

GRANT SELECT ON auth.users TO authenticated;
