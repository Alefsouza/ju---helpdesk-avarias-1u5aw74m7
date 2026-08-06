UPDATE public.chamados
SET
  status_aprovacao_alex = 'pendente',
  status_interno = 'AGUARDANDO_ALEX',
  atualizado_em = NOW()
WHERE
  status = 'finalizado'
  AND COALESCE(status_aprovacao_alex, '') <> 'pendente'
  AND id IN (
    SELECT aci.chamado_id
    FROM public.anexos_chamado_interno aci
    WHERE aci.nome_arquivo ILIKE '%vale%'
  )
  AND usuario_id IN (
    SELECT pu.id
    FROM public.perfil_usuario pu
    WHERE pu.tipo_usuario <> 'juridico'
      OR pu.tipo_usuario IS NULL
  );
