-- Adjust chamados RLS policies so that sinistro users can see chamados
-- created by third parties (no garagem in perfil_usuario).
-- When the creator's perfil_usuario.garagem is NULL, fall back to
-- chamados.garagem for the garage comparison.

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
        AND (
          COALESCE(
            (SELECT garagem FROM public.perfil_usuario WHERE id = chamados.usuario_id),
            chamados.garagem
          ) = (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid())
        )
      )
    )
  );

-- 2. Update chamados UPDATE policy
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
          AND (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()) IS NOT NULL
          AND (
            COALESCE(
              (SELECT garagem FROM public.perfil_usuario WHERE id = chamados.usuario_id),
              chamados.garagem
            ) = (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid())
          )
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
          AND (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()) IS NOT NULL
          AND (
            COALESCE(
              (SELECT garagem FROM public.perfil_usuario WHERE id = chamados.usuario_id),
              chamados.garagem
            ) = (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid())
          )
        )
      )
    )
  );
