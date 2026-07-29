-- Ensure financeiro (and other relevant roles) can SELECT from anexos_chamado_interno
-- Idempotent: DROP IF EXISTS then CREATE POLICY

-- Broad SELECT policy for anexos_chamado_interno covering financeiro and other roles
DROP POLICY IF EXISTS "financeiro_select_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "financeiro_select_anexos_internos" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (
    (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'financeiro'
  );

-- Also ensure a comprehensive SELECT policy exists for all internal roles
DROP POLICY IF EXISTS "anexos_internos_select_all_roles" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_select_all_roles" ON public.anexos_chamado_interno
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
    OR (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'financeiro'
    OR (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'contabil'
    OR (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'diretor'
  );

-- Storage: ensure financeiro can read objects from anexos_chamados_interno bucket
DROP POLICY IF EXISTS "financeiro_select_anexos_internos_storage" ON storage.objects;
CREATE POLICY "financeiro_select_anexos_internos_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos_chamados_interno'
    AND (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'financeiro'
  );
