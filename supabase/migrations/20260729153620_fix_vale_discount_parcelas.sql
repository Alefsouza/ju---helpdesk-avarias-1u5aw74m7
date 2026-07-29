-- Fix existing parcel for carro 52220, OS 905866
-- The parcel was created with R$ 509.43 (full value) but the signed PDF shows R$ 458.49 (with 10% discount).
-- This corrects both parcelas_vales and solicitacoes_parcelamento to match the signed document.
DO $$
DECLARE
  v_chamado_id uuid;
BEGIN
  SELECT id INTO v_chamado_id
  FROM public.chamados
  WHERE carro = '52220' AND numero_os = '905866'
  LIMIT 1;

  IF v_chamado_id IS NOT NULL THEN
    -- Fix parcelas_vales: set the correct discounted value (single parcel)
    UPDATE public.parcelas_vales
    SET valor_parcela = 458.49
    WHERE chamado_id = v_chamado_id
      AND valor_parcela = 509.43;

    -- Fix solicitacoes_parcelamento: mark discount as applied and set correct value
    UPDATE public.solicitacoes_parcelamento
    SET desconto_aplicado = true,
        valor_orcamento = 458.49,
        atualizado_em = NOW()
    WHERE chamado_id = v_chamado_id
      AND valor_orcamento = 509.43;
  END IF;
END $$;

-- Create a helper function to safely recompute and sync parcel values from a solicitacao
-- This enforces that parcelas_vales always reflect the discounted valor_orcamento.
CREATE OR REPLACE FUNCTION public.sync_parcelas_from_solicitacao(p_chamado_id uuid)
RETURNS void AS $$
DECLARE
  v_solicitacao record;
  v_existing_count integer;
  v_today date;
  v_base_date date;
  v_parcela record;
BEGIN
  SELECT * INTO v_solicitacao
  FROM public.solicitacoes_parcelamento
  WHERE chamado_id = p_chamado_id
  ORDER BY criado_em DESC
  LIMIT 1;

  IF v_solicitacao IS NULL THEN
    RETURN;
  END IF;

  -- Only proceed if there are existing active parcels to sync
  SELECT COUNT(*) INTO v_existing_count
  FROM public.parcelas_vales
  WHERE chamado_id = p_chamado_id
    AND status = 'ativo';

  IF v_existing_count = 0 THEN
    RETURN;
  END IF;

  -- The valor_orcamento already stores the final (discounted) value.
  -- Recalculate parcels using this value to ensure consistency.
  v_today := CURRENT_DATE;
  v_base_date := date_trunc('month', v_today)::date;

  FOR v_parcela IN
    SELECT * FROM public.calcular_parcelas_vale(
      v_solicitacao.valor_orcamento,
      v_solicitacao.quantidade_parcelas,
      v_base_date
    )
  LOOP
    UPDATE public.parcelas_vales
    SET valor_parcela = v_parcela.valor_parcela
    WHERE chamado_id = p_chamado_id
      AND data_referencia = v_parcela.data_referencia
      AND status = 'ativo';
  END LOOP;

  -- Ensure the discount flag is persisted
  IF v_solicitacao.desconto_aplicado IS NULL THEN
    UPDATE public.solicitacoes_parcelamento
    SET desconto_aplicado = false,
        atualizado_em = NOW()
    WHERE id = v_solicitacao.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
