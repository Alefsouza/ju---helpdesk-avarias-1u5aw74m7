-- Adiciona coluna garagem_colaborador (texto, nullable) na tabela public.registros
-- Puramente aditiva: nenhum dado existente é alterado ou excluído

ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS garagem_colaborador TEXT;
