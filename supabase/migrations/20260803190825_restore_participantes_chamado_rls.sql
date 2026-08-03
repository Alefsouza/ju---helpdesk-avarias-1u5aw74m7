-- Restore participant check in chamados RLS policies
-- The migration 20260803164200_sinistro_garagem_fallback.sql removed the
-- participant condition. This migration re-adds it so users listed in
-- participantes_chamado can access the corresponding ticket.

-- 1. Update chamados SELECT policy to include participantes_chamado check
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
    OR is_secretaria_tecnica()
    OR (
      is_vistoriador()
      AND garagem = (
        SELECT perfil_usuario.garagem
        FROM public.perfil_usuario
        WHERE perfil_usuario.id = auth.uid()
      )
    )
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
    OR (
      id IN (
        SELECT chamado_id
        FROM public.participantes_chamado
        WHERE usuario_id = auth.uid()
      )
    )
  );

-- 2. Update chamados UPDATE policy to include participantes_chamado check
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
    OR (
      id IN (
        SELECT chamado_id
        FROM public.participantes_chamado
        WHERE usuario_id = auth.uid()
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
    OR (
      id IN (
        SELECT chamado_id
        FROM public.participantes_chamado
        WHERE usuario_id = auth.uid()
      )
    )
  );
