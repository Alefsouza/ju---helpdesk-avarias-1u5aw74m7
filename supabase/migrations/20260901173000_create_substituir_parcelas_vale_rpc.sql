-- Função RPC para substituir as parcelas ativas de um vale por novas parcelas atomicamente.
-- Executada como SECURITY DEFINER para permitir que perfis autorizados (como sinistro)
-- atualizem o status de parcelas anteriores para 'cancelado' e insiram as novas parcelas 'ativo'
-- sem serem barrados por políticas RLS na leitura/atualização.

CREATE OR REPLACE FUNCTION public.substituir_parcelas_vale(
  p_chamado_id uuid,
  p_parcelas jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Marca como cancelado apenas as parcelas ativas do chamado informado
  UPDATE public.parcelas_vales
  SET status = 'cancelado'
  WHERE chamado_id = p_chamado_id
    AND status = 'ativo';

  -- 2. Insere as novas parcelas se fornecidas
  IF p_parcelas IS NOT NULL AND jsonb_array_length(p_parcelas) > 0 THEN
    INSERT INTO public.parcelas_vales (
      chamado_id,
      valor_parcela,
      data_referencia,
      vale_unificado,
      status
    )
    SELECT
      p_chamado_id,
      (item->>'valor_parcela')::numeric,
      (item->>'data_referencia')::date,
      COALESCE((item->>'vale_unificado')::boolean, false),
      'ativo'
    FROM jsonb_array_elements(p_parcelas) AS item;
  END IF;
END;
$$;

-- Garante que usuários autenticados possam executar a função
GRANT EXECUTE ON FUNCTION public.substituir_parcelas_vale(uuid, jsonb) TO authenticated;
