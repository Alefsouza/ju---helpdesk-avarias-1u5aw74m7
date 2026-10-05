-- Update anexos_internos_delete policy on public.anexos_chamado_interno
-- Restricts DELETE for users with tipo_usuario IN ('juridico', 'sinistro')
-- when the associated chamado has status_aprovacao_alex = 'aprovado' OR status_aprovacao_claudinei = 'aprovado'.
-- Other roles (admin, secretaria_tecnica, responsavel, file owner who is not juridico/sinistro) retain current deletion permissions.

DROP POLICY IF EXISTS "anexos_internos_delete" ON public.anexos_chamado_interno;

CREATE POLICY "anexos_internos_delete" ON public.anexos_chamado_interno
  FOR DELETE TO authenticated
  USING (
    -- Admin always allowed
    public.is_admin()
    -- Secretaria técnica allowed
    OR public.is_secretaria_tecnica()
    -- Responsible user or file owner allowed UNLESS they are juridico/sinistro on an approved chamado
    OR (
      (
        public.is_juridico()
        OR public.is_sinistro()
        OR (usuario_id = auth.uid())
        OR (chamado_id IN (SELECT chamados.id FROM public.chamados WHERE chamados.responsavel_id = auth.uid()))
      )
      AND NOT (
        (public.is_juridico() OR public.is_sinistro())
        AND EXISTS (
          SELECT 1 FROM public.chamados
          WHERE chamados.id = anexos_chamado_interno.chamado_id
            AND (
              chamados.status_aprovacao_alex = 'aprovado'
              OR chamados.status_aprovacao_claudinei = 'aprovado'
            )
        )
      )
    )
  );
