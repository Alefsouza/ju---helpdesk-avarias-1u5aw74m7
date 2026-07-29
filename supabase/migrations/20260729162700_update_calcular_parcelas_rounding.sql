-- Update calcular_parcelas_vale to round the last installment, matching the PDF logic exactly.
-- The PDF uses Math.round on the last parcel; the DB function previously did not round it.
CREATE OR REPLACE FUNCTION public.calcular_parcelas_vale(
  p_valor_base numeric,
  p_quantidade_parcelas integer,
  p_data_base date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  numero_parcela integer,
  valor_parcela numeric,
  data_referencia date
) AS $$
DECLARE
  v_valor_parcela numeric;
  v_ultimo_valor numeric;
BEGIN
  v_valor_parcela := round(p_valor_base / p_quantidade_parcelas, 2);
  v_ultimo_valor := round(p_valor_base - (v_valor_parcela * (p_quantidade_parcelas - 1)), 2);

  FOR i IN 1..p_quantidade_parcelas LOOP
    numero_parcela := i;

    IF i = p_quantidade_parcelas THEN
      valor_parcela := v_ultimo_valor;
    ELSE
      valor_parcela := v_valor_parcela;
    END IF;

    data_referencia := date_trunc('month', p_data_base) + ((i - 1) || ' month')::interval;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
