-- Permitir que public atualize o campo operacao em qualquer chamado
DROP POLICY IF EXISTS "chamados_update_public_operacao" ON public.chamados;
CREATE POLICY "chamados_update_public_operacao" ON public.chamados
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);
