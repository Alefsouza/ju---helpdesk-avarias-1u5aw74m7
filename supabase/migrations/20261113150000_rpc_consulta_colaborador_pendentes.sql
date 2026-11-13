-- rpc_consulta_colaborador: adiciona informação das parcelas PENDENTES (não exportadas)
-- Pendentes = parcelas ATIVAS com data_referencia >= 1º dia do mês corrente
-- (timezone America/Sao_Paulo), o mesmo corte usado em valor_exportado.
-- Novas colunas:
--   parcelas_pendentes integer  -> qtd de parcelas pendentes
--   pendente_primeira  date     -> competência da 1ª pendente
--   pendente_ultima    date     -> competência da última pendente
-- Preserva todas as colunas do contrato anterior (incluindo valor_exportado e
-- proxima_parcela) e apenas ADICIONA as novas. SECURITY DEFINER: ignora RLS,
-- então o cálculo funciona para qualquer perfil.

DROP FUNCTION IF EXISTS public.rpc_consulta_colaborador(text);

CREATE OR REPLACE FUNCTION public.rpc_consulta_colaborador(p_busca text)
 RETURNS TABLE(chamado_id uuid, titulo text, status_chamado text, status_interno text, status_aprovacao_alex text, status_aprovacao_claudinei text, status_aprovacao text, aprovacoes_diretoria jsonb, situacao_processo text, status_juridico text, carro text, linha text, data_ocorrencia date, criado_em timestamp with time zone, registro_motorista text, nome_motorista text, registro_cobrador text, nome_cobrador text, pia text, tipo_chamado text, parcelas_ativas integer, valor_parcelas numeric, valor_exportado numeric, proxima_parcela date, cobranca_status text, parcelas_pendentes integer, pendente_primeira date, pendente_ultima date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_busca text := trim(coalesce(p_busca, ''));
  v_registros text[];
  v_chamados_espelho uuid[];
  v_corte date := (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo'))::date;
BEGIN
  IF v_busca = '' THEN RETURN; END IF;

  SELECT array_agg(DISTINCT r.registro) INTO v_registros
  FROM registros r
  WHERE trim(r.registro) = v_busca OR r.registro ILIKE v_busca || '%' OR r.nome ILIKE '%' || v_busca || '%';

  SELECT array_agg(DISTINCT f.chamado_id) INTO v_chamados_espelho
  FROM formularios_espelho_danos f
  WHERE (v_registros IS NOT NULL AND f.registro_motorista = ANY(v_registros))
     OR f.nome_motorista ILIKE '%' || v_busca || '%';

  RETURN QUERY
  SELECT c.id, c.titulo, c.status, c.status_interno,
    c.status_aprovacao_alex, c.status_aprovacao_claudinei, c.status_aprovacao,
    c.aprovacoes_diretoria, c.situacao_processo, c.status_juridico,
    c.carro, c.linha, c.data_ocorrencia, c.criado_em,
    COALESCE(c.registro_motorista, fe.reg_esp), COALESCE(c.nome_motorista, fe.nome_esp),
    c.registro_cobrador, c.nome_cobrador, c.pia, c.tipo_chamado,
    COALESCE(pv.qtd, 0)::int, COALESCE(pv.valor, 0), COALESCE(pv.exportado, 0), pv.proxima,
    CASE WHEN COALESCE(pv.qtd, 0) > 0 THEN 'cobrado' ELSE 'nao_cobrado' END,
    COALESCE(pv.pend_qtd, 0)::int, pv.pend_primeira, pv.pend_ultima
  FROM chamados c
  LEFT JOIN LATERAL (
    SELECT f.registro_motorista AS reg_esp, f.nome_motorista AS nome_esp
    FROM formularios_espelho_danos f WHERE f.chamado_id = c.id LIMIT 1
  ) fe ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS qtd, SUM(p.valor_parcela) AS valor,
           COALESCE(SUM(p.valor_parcela) FILTER (
             WHERE p.data_referencia < v_corte
           ), 0) AS exportado,
           COALESCE(MIN(p.data_referencia) FILTER (WHERE p.data_referencia >= CURRENT_DATE), MAX(p.data_referencia)) AS proxima,
           COUNT(*) FILTER (WHERE p.data_referencia >= v_corte)::int AS pend_qtd,
           MIN(p.data_referencia) FILTER (WHERE p.data_referencia >= v_corte) AS pend_primeira,
           MAX(p.data_referencia) FILTER (WHERE p.data_referencia >= v_corte) AS pend_ultima
    FROM parcelas_vales p WHERE p.chamado_id = c.id AND p.status = 'ativo'
  ) pv ON TRUE
  WHERE
    (v_registros IS NOT NULL AND (c.registro_motorista = ANY(v_registros) OR c.registro_cobrador = ANY(v_registros)))
    OR (v_chamados_espelho IS NOT NULL AND c.id = ANY(v_chamados_espelho))
    OR c.registro_motorista ILIKE '%' || v_busca || '%'
    OR c.registro_cobrador  ILIKE '%' || v_busca || '%'
    OR c.nome_motorista     ILIKE '%' || v_busca || '%'
    OR c.nome_cobrador      ILIKE '%' || v_busca || '%'
  ORDER BY c.criado_em DESC
  LIMIT 200;
END;
$function$;
