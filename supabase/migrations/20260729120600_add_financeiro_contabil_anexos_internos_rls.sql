-- RLS: Allow Financeiro users to SELECT anexos_chamado_interno
DROP POLICY IF EXISTS "financeiro_select_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "financeiro_select_anexos_internos" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING ((SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'financeiro');

-- RLS: Allow Contabil users to SELECT anexos_chamado_interno
DROP POLICY IF EXISTS "contabil_select_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "contabil_select_anexos_internos" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING ((SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'contabil');

-- Storage: Allow Financeiro users to read objects from anexos_chamados_interno bucket
DROP POLICY IF EXISTS "financeiro_select_anexos_internos_storage" ON storage.objects;
CREATE POLICY "financeiro_select_anexos_internos_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos_chamados_interno'
    AND (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'financeiro'
  );

-- Storage: Allow Contabil users to read objects from anexos_chamados_interno bucket
DROP POLICY IF EXISTS "contabil_select_anexos_internos_storage" ON storage.objects;
CREATE POLICY "contabil_select_anexos_internos_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos_chamados_interno'
    AND (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'contabil'
  );
