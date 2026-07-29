DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON public.notificacoes;
CREATE POLICY "enable_insert_for_authenticated_users" ON public.notificacoes
  FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
