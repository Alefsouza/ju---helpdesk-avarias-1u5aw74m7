-- Nova regra de reprovação de vales (1 recusa da diretoria reprova de vez).
-- Corrige o caso existente do PIA 002082026/251 (chamado d67f587d-adbc-489f-a025-a0a7ce12469b):
-- recusa única de Sonia Mattoso em 19/11/2026 ficou em 'aprovacao_parcial'
-- (regra antiga de 2 decisões); deve virar 'reprovado' para sair da fila
-- de Pendentes de Aprovação e voltar para Sinistro/Jurídico.
--
-- Também estende o CHECK de historico_chamado.acao para aceitar as ações
-- 'Aprovação Diretor' / 'Reprovação Diretor' / 'Roteamento Documentos'
-- (usadas pela tela ValesAprovacao; sem elas os inserts falham silenciosamente
-- e nem o histórico nem a mensagem automática de reprovação são gravados).
--
-- Idempotente: roda quantas vezes for necessário sem duplicar efeitos.

-- 1. Estende a constraint de acao do histórico (com as ações já existentes)
ALTER TABLE public.historico_chamado DROP CONSTRAINT IF EXISTS historico_chamado_acao_check;

ALTER TABLE public.historico_chamado ADD CONSTRAINT historico_chamado_acao_check
  CHECK (acao = ANY (ARRAY[
    'criado'::text,
    'atribuido'::text,
    'respondido'::text,
    'finalizado'::text,
    'deletado'::text,
    'transferido'::text,
    'reaberto'::text,
    'pendente'::text,
    'recusado'::text,
    'recusou_chamado'::text,
    'remocao_manual_arquivos'::text,
    'Justificativa: Não Houve Orçamento'::text,
    'Aprovação Diretor'::text,
    'Reprovação Diretor'::text,
    'Roteamento Documentos'::text
  ]));

-- 2. Corrige o chamado 002082026/251: aprovacao_parcial -> reprovado
UPDATE public.chamados
SET status_aprovacao = 'reprovado',
    status = 'em_andamento',
    status_interno = 'Reprovado Diretoria',
    atualizado_em = now()
WHERE id = 'd67f587d-adbc-489f-a025-a0a7ce12469b'::uuid
  AND status_aprovacao = 'aprovacao_parcial'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(aprovacoes_diretoria) a
    WHERE a->>'acao' = 'recusado'
  );

-- 3. Garante a mensagem automática no CHAT INTERNO (mensagens_internas_chamado,
--    não no chat de Interação) para o caso do 251, se ainda não existir
INSERT INTO public.mensagens_internas_chamado (chamado_id, usuario_id, mensagem)
SELECT c.id,
       (a->>'usuario_id')::uuid,
       'Vale reprovado pela diretoria. Motivos: ' || (a->>'motivo')
FROM public.chamados c
CROSS JOIN LATERAL jsonb_array_elements(c.aprovacoes_diretoria) a
WHERE c.id = 'd67f587d-adbc-489f-a025-a0a7ce12469b'::uuid
  AND a->>'acao' = 'recusado'
  AND NOT EXISTS (
    SELECT 1 FROM public.mensagens_internas_chamado m
    WHERE m.chamado_id = c.id
      AND m.mensagem = 'Vale reprovado pela diretoria. Motivos: ' || (a->>'motivo')
  );

-- 4. Registra a correção no histórico do chamado (idempotente)
INSERT INTO public.historico_chamado (chamado_id, usuario_id, acao, detalhes)
SELECT c.id,
       (a->>'usuario_id')::uuid,
       'Reprovação Diretor',
       'Vale reprovado pela diretoria. Motivo: ' || (a->>'motivo')
FROM public.chamados c
CROSS JOIN LATERAL jsonb_array_elements(c.aprovacoes_diretoria) a
WHERE c.id = 'd67f587d-adbc-489f-a025-a0a7ce12469b'::uuid
  AND a->>'acao' = 'recusado'
  AND NOT EXISTS (
    SELECT 1 FROM public.historico_chamado h
    WHERE h.chamado_id = c.id
      AND h.acao = 'Reprovação Diretor'
      AND h.detalhes = 'Vale reprovado pela diretoria. Motivo: ' || (a->>'motivo')
  );
