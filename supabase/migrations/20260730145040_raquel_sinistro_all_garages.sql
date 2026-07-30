-- Allow raquel.santos@viasudeste.com (sinistro type) to see and manage chamados
-- from ALL garagens, bypassing the garage-based restriction for sinistro users.
-- Uses auth.jwt() ->> 'email' instead of querying auth.users (which the
-- authenticated role cannot access).

-- 1. Update chamados SELECT policy
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'raquel.santos@viasudeste.com'
    OR (usuario_id = auth.uid())
    OR (responsavel_id = auth.uid())
    OR is_admin()
    OR is_responsavel()
    OR is_sos()
    OR is_coc()
    OR is_juridico()
    OR (
      is_sinistro()
      AND (
        (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()) IS NOT NULL
        AND (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid())
            = (SELECT garagem FROM public.perfil_usuario WHERE id = chamados.usuario_id)
      )
    )
  );

-- 2. Update chamados UPDATE policy (so she can manage incidents across garagens)
DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'raquel.santos@viasudeste.com'
    OR (usuario_id = auth.uid())
    OR (responsavel_id = auth.uid())
    OR is_admin()
    OR is_sos()
    OR is_coc()
    OR (
      (status = 'aberto'::text OR status = 'finalizado'::text)
      AND (
        is_responsavel()
        OR is_juridico()
        OR (
          is_sinistro()
          AND (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid())
              = (SELECT garagem FROM public.perfil_usuario WHERE id = chamados.usuario_id)
        )
      )
    )
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'raquel.santos@viasudeste.com'
    OR (usuario_id = auth.uid())
    OR (responsavel_id = auth.uid())
    OR is_admin()
    OR is_sos()
    OR is_coc()
    OR (
      (status = 'aberto'::text OR status = 'finalizado'::text)
      AND (
        is_responsavel()
        OR is_juridico()
        OR (
          is_sinistro()
          AND (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid())
              = (SELECT garagem FROM public.perfil_usuario WHERE id = chamados.usuario_id)
        )
      )
    )
  );
