-- Limpeza de lançamentos de TESTE do Alex Fontes (29/06/2026) no chamado PIA 002062026/177 (carro 52849, OS 324577).
-- Remove SOMENTE:
--   1) As duas entradas do Histórico 'Autorização de Desconto gerada com sucesso no valor de R$ 470,41'
--      criadas em 29/06/2026 às 13:32 e 13:36 por Alex Fontes (eram testes).
--   2) Os dois documentos 'Autorizacao_Desconto_...20260629133223.docx' e '...20260629133634.docx' de 29/06/2026.
--   3) Os arquivos .docx de teste correspondentes no bucket de storage, se ainda existirem.
-- NÃO toca em nada mais do chamado (BO, fotos, relatos, orçamento, histórico da Gabriella etc.).
-- Idempotente: DELETE sem match é inofensivo.

-- 1) Histórico de chamado: apenas as entradas de teste do dia 29/06/2026
DELETE FROM public.historico_chamado
WHERE chamado_id = '5b7bc742-55e3-4b58-880c-b3f537490ef0'::uuid
  AND criado_em >= timestamptz '2026-06-29 00:00:00+00'
  AND criado_em <  timestamptz '2026-06-30 00:00:00+00'
  AND detalhes LIKE 'Autorização de Desconto gerada com sucesso no valor de R$ 470,41%';

-- 2) Documentos: os dois .docx de teste de 29/06/2026 (13:32:23 e 13:36:34)
DELETE FROM public.documentos
WHERE chamado_id = '5b7bc742-55e3-4b58-880c-b3f537490ef0'::uuid
  AND tipo_documento = 'Vale'
  AND criado_em >= timestamptz '2026-06-29 00:00:00+00'
  AND criado_em <  timestamptz '2026-06-30 00:00:00+00'
  AND (nome_arquivo LIKE '%20260629133223.docx' OR nome_arquivo LIKE '%20260629133634.docx');

-- 3) Arquivos no bucket de storage: o Supabase bloqueia DELETE direto em storage.objects
--    (storage.protect_delete — só via Storage API). Os registros da tabela documentos são
--    removidos acima, então os arquivos .docx de teste deixam de aparecer no app; ficam
--    apenas órfãos no bucket, inacessíveis pela aplicação.
