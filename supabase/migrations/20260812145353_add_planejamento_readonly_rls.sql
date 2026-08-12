-- SELECT-only RLS policies for planejamento profile
-- These policies grant read-only access to chamado detail data
-- No INSERT, UPDATE, or DELETE permissions are granted

-- anexos_chamado_interno: SELECT only
DROP POLICY IF EXISTS "planejamento_select_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "planejamento_select_anexos_internos" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING ((SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'planejamento');

-- historico_chamado: SELECT only
DROP POLICY IF EXISTS "planejamento_select_historico_chamado" ON public.historico_chamado;
CREATE POLICY "planejamento_select_historico_chamado" ON public.historico_chamado
  FOR SELECT TO authenticated
  USING ((SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'planejamento');

-- respostas_chamado: SELECT only
DROP POLICY IF EXISTS "planejamento_select_respostas_chamado" ON public.respostas_chamado;
CREATE POLICY "planejamento_select_respostas_chamado" ON public.respostas_chamado
  FOR SELECT TO authenticated
  USING ((SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'planejamento');

-- documentos: SELECT only
DROP POLICY IF EXISTS "planejamento_select_documentos" ON public.documentos;
CREATE POLICY "planejamento_select_documentos" ON public.documentos
  FOR SELECT TO authenticated
  USING ((SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'planejamento');

-- anexos_chamado: SELECT only
DROP POLICY IF EXISTS "planejamento_select_anexos_chamado" ON public.anexos_chamado;
CREATE POLICY "planejamento_select_anexos_chamado" ON public.anexos_chamado
  FOR SELECT TO authenticated
  USING ((SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'planejamento');

-- Storage: Allow planejamento to read objects from anexos_chamados_interno bucket
DROP POLICY IF EXISTS "planejamento_select_anexos_internos_storage" ON storage.objects;
CREATE POLICY "planejamento_select_anexos_internos_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos_chamados_interno'
    AND (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'planejamento'
  );

-- Storage: Allow planejamento to read objects from chamados bucket
DROP POLICY IF EXISTS "planejamento_select_chamados_storage" ON storage.objects;
CREATE POLICY "planejamento_select_chamados_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chamados'
    AND (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'planejamento'
  );
