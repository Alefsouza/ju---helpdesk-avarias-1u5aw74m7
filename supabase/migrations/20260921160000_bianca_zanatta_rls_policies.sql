-- RLS Policies for Bianca Zanatta (bianca.zanatta@viasudeste.com)
-- Grants same permissions as Dr. Claudinei for ticket approval workflow:
-- 1. SELECT on chamados
-- 2. UPDATE on chamados (for approval flow)
-- 3. SELECT on anexos_chamado_interno
-- 4. SELECT on storage.objects for bucket 'anexos_chamados_interno'
-- 5. SELECT on historico_chamado
-- 6. INSERT on historico_chamado

-- 1. SELECT on chamados
DROP POLICY IF EXISTS "bianca_zanatta_select_chamados" ON public.chamados;
CREATE POLICY "bianca_zanatta_select_chamados" ON public.chamados
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' = 'bianca.zanatta@viasudeste.com');

-- 2. UPDATE on chamados (for approval flow)
DROP POLICY IF EXISTS "bianca_zanatta_update_chamados" ON public.chamados;
CREATE POLICY "bianca_zanatta_update_chamados" ON public.chamados
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'email' = 'bianca.zanatta@viasudeste.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'bianca.zanatta@viasudeste.com');

-- 3. SELECT on anexos_chamado_interno
DROP POLICY IF EXISTS "bianca_zanatta_select_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "bianca_zanatta_select_anexos_internos" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' = 'bianca.zanatta@viasudeste.com');

-- 4. SELECT on storage.objects for anexos_chamados_interno bucket
DROP POLICY IF EXISTS "bianca_zanatta_select_anexos_internos_storage" ON storage.objects;
CREATE POLICY "bianca_zanatta_select_anexos_internos_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos_chamados_interno'
    AND auth.jwt() ->> 'email' = 'bianca.zanatta@viasudeste.com'
  );

-- 5. SELECT on historico_chamado
DROP POLICY IF EXISTS "bianca_zanatta_select_historico_chamado" ON public.historico_chamado;
CREATE POLICY "bianca_zanatta_select_historico_chamado" ON public.historico_chamado
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' = 'bianca.zanatta@viasudeste.com');

-- 6. INSERT on historico_chamado
DROP POLICY IF EXISTS "bianca_zanatta_insert_historico_chamado" ON public.historico_chamado;
CREATE POLICY "bianca_zanatta_insert_historico_chamado" ON public.historico_chamado
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = 'bianca.zanatta@viasudeste.com');
