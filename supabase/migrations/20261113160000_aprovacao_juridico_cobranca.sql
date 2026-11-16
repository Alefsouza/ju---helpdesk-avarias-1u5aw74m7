-- Fluxo de cobrança de motorista pelo Jurídico (dupla aprovação: gestores 1/2 + diretoria 2/2)
alter table public.chamados
  add column if not exists registro_motorista_cobranca text,
  add column if not exists nome_motorista_cobranca text,
  add column if not exists status_aprovacao_juridico_1 text,
  add column if not exists aprovador_juridico_1 uuid references auth.users(id),
  add column if not exists aprovador_juridico_1_em timestamptz,
  add column if not exists justificativa_juridico_1 text,
  add column if not exists status_aprovacao_diretoria_2 text,
  add column if not exists aprovacoes_diretoria_cobranca jsonb not null default '[]'::jsonb,
  add column if not exists justificativa_diretoria_2 text;

create index if not exists idx_chamados_cobranca_juridico
  on public.chamados (registro_motorista_cobranca)
  where registro_motorista_cobranca is not null;

create index if not exists idx_chamados_aprovacao_juridico_1
  on public.chamados (status_aprovacao_juridico_1)
  where status_aprovacao_juridico_1 is not null;
