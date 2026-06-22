DROP FUNCTION IF EXISTS public.calcular_parcelas_vale(numeric, integer, date);

CREATE OR REPLACE FUNCTION public.calcular_parcelas_vale(
  p_valor_base numeric,
  p_quantidade_parcelas integer,
  p_data_base date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  numero_parcela integer,
  valor_parcela numeric,
  data_referencia date
) AS $BODY$
DECLARE
  v_valor_parcela numeric;
  v_data_referencia date;
BEGIN
  IF p_quantidade_parcelas <= 0 THEN
    RETURN;
  END IF;

  v_valor_parcela := round(p_valor_base / p_quantidade_parcelas, 2);
  v_data_referencia := COALESCE(p_data_base, CURRENT_DATE);

  FOR i IN 1..p_quantidade_parcelas LOOP
    numero_parcela := i;
    valor_parcela := v_valor_parcela;
    -- Adding months via interval correctly handles leap years and variable month days
    data_referencia := (v_data_referencia + ((i - 1) || ' months')::interval)::date;
    RETURN NEXT;
  END LOOP;
END;
$BODY$ LANGUAGE plpgsql;
