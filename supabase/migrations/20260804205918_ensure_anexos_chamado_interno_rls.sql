-- Ensure RLS policies on anexos_chamado_interno allow authenticated users to SELECT.
-- Idempotent: DROP IF EXISTS before CREATE POLICY.

-- SELECT policy: allow authenticated users (roles used by the app) to read internal attachments
DROP POLICY IF EXISTS "anexos_internos_select_authenticated" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_select_authenticated" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_responsavel()
    OR public.is_sinistro()
    OR public.is_secretaria_tecnica()
    OR public.is_coc()
    OR public.is_juridico()
    OR public.is_dp()
    OR public.is_sos()
    OR public.is_vistoriador()
    OR usuario_id = auth.uid()
  );

-- INSERT policy: allow authenticated users to insert their own attachments
DROP POLICY IF EXISTS "anexos_internos_insert_authenticated" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_insert_authenticated" ON public.anexos_chamado_interno
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_responsavel()
    OR public.is_sinistro()
    OR public.is_secretaria_tecnica()
    OR public.is_coc()
    OR public.is_juridico()
    OR public.is_dp()
    OR public.is_sos()
    OR public.is_vistoriador()
    OR usuario_id = auth.uid()
  );

-- UPDATE policy: allow owners/admins/responsaveis to update
DROP POLICY IF EXISTS "anexos_internos_update_authenticated" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_update_authenticated" ON public.anexos_chamado_interno
  FOR UPDATE TO authenticated
  USING (
    usuario_id = auth.uid()
    AND (public.is_responsavel() OR public.is_admin())
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND (public.is_responsavel() OR public.is_admin())
  );

-- DELETE policy: allow owners/admins/responsaveis to delete
DROP POLICY IF EXISTS "anexos_internos_delete_authenticated" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_delete_authenticated" ON public.anexos_chamado_interno
  FOR DELETE TO authenticated
  USING (
    usuario_id = auth.uid()
    AND (public.is_responsavel() OR public.is_admin())
  );
