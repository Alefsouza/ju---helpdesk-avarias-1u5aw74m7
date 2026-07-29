-- Fix parcelas_vales.valor_parcela to match the signed Autorização de Desconto (PDF)
-- The PDF uses valor_final (after 10% discount) but installments were saved using valor_orcamento (undiscounted)

-- 1. Specific fix for OS 905866 (Carro 52220)
-- Autorização de Desconto specifies R$ 458,49 (after 10% discount from R$ 509,43)
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
      AND valor_parcela = 509.43;

    UPDATE public.solicitacoes_parcelamento
    SET desconto_aplicado = true,
        atualizado_em = NOW()
    WHERE chamado_id = v_chamado_id
      AND (desconto_aplicado IS NULL OR desconto_aplicado = false);
  END IF;
END $$;

-- 2. General fix: recalculate installments for ALL records where desconto_aplicado = true
--    but the sum of parcelas_vales matches the undiscounted valor_orcamento
--    (indicating installments were calculated without the discount)
DO $$
DECLARE
  rec RECORD;
  v_valor_final NUMERIC;
  v_valor_por_parcela NUMERIC;
  v_soma_parcelas NUMERIC;
  v_last_id uuid;
BEGIN
  FOR rec IN
    SELECT
      sp.chamado_id,
      sp.valor_orcamento,
      sp.quantidade_parcelas
    FROM public.solicitacoes_parcelamento sp
    WHERE sp.desconto_aplicado = true
      AND sp.quantidade_parcelas > 0
  LOOP
    SELECT COALESCE(SUM(valor_parcela), 0) INTO v_soma_parcelas
    FROM public.parcelas_vales
    WHERE chamado_id = rec.chamado_id;

    -- Only fix if the sum of installments matches the UNDISCOUNTED valor_orcamento
    -- (within 0.02 tolerance for rounding), meaning the discount was NOT applied
    IF v_soma_parcelas > 0 AND ABS(v_soma_parcelas - rec.valor_orcamento) < 0.02 THEN
      v_valor_final := ROUND(rec.valor_orcamento * 0.9, 2);
      v_valor_por_parcela := ROUND(v_valor_final / rec.quantidade_parcelas, 2);

      SELECT id INTO v_last_id
      FROM public.parcelas_vales
      WHERE chamado_id = rec.chamado_id
      ORDER BY data_referencia DESC
      LIMIT 1;

      -- Update all installments except the last one
      UPDATE public.parcelas_vales
      SET valor_parcela = v_valor_por_parcela
      WHERE chamado_id = rec.chamado_id
        AND id IS DISTINCT FROM v_last_id
        AND valor_parcela IS DISTINCT FROM v_valor_por_parcela;

      -- Update the last installment with the adjusted value (covers rounding difference)
      UPDATE public.parcelas_vales
      SET valor_parcela = ROUND(v_valor_final - (v_valor_por_parcela * (rec.quantidade_parcelas - 1)), 2)
      WHERE chamado_id = rec.chamado_id
        AND id = v_last_id;
    END IF;
  END LOOP;
END $$;
