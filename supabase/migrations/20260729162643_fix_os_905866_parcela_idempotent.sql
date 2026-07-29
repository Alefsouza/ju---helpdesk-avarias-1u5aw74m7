-- Idempotent fix for OS 905866 (Carro 52220): ensure parcelas_vales.valor_parcela = 458.49
-- and solicitacoes_parcelamento reflects the discounted value with desconto_aplicado = true.
DO $$
DECLARE
  v_chamado_id uuid;
BEGIN
  SELECT id INTO v_chamado_id
  FROM public.chamados
  WHERE numero_os = '905866'
  LIMIT 1;

  IF v_chamado_id IS NOT NULL THEN
    UPDATE public.parcelas_vales
    SET valor_parcela = 458.49
    WHERE chamado_id = v_chamado_id
      AND valor_parcela IS DISTINCT FROM 458.49;

    UPDATE public.solicitacoes_parcelamento
    SET desconto_aplicado = true,
        valor_orcamento = 458.49,
        atualizado_em = NOW()
    WHERE chamado_id = v_chamado_id
      AND (
        valor_orcamento IS DISTINCT FROM 458.49
        OR COALESCE(desconto_aplicado, false) IS DISTINCT FROM true
      );
  END IF;
END $$;
