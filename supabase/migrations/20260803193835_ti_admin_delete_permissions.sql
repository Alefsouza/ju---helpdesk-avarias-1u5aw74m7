-- Allow ti@viasudeste.com to delete from anexos_chamado, documentos, and anexos_chamado_interno

DROP POLICY IF EXISTS "ti_admin_delete_anexos_chamado" ON public.anexos_chamado;
CREATE POLICY "ti_admin_delete_anexos_chamado" ON public.anexos_chamado
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'ti@viasudeste.com')
  );

DROP POLICY IF EXISTS "ti_admin_delete_documentos" ON public.documentos;
CREATE POLICY "ti_admin_delete_documentos" ON public.documentos
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'ti@viasudeste.com')
  );

DROP POLICY IF EXISTS "ti_admin_delete_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "ti_admin_delete_anexos_internos" ON public.anexos_chamado_interno
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'ti@viasudeste.com')
  );
