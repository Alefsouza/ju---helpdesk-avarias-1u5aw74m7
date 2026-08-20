-- Permitir UPDATE e SELECT em chamados para permitir a liberação de carros para operação em qualquer tipo de chamado
DROP POLICY IF EXISTS "chamados_update_public_all" ON public.chamados;
CREATE POLICY "chamados_update_public_all" ON public.chamados
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "chamados_select_public_all" ON public.chamados;
CREATE POLICY "chamados_select_public_all" ON public.chamados
  FOR SELECT TO public
  USING (true);
