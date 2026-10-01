-- Desunificação do chamado 3b42e336-031f-4519-9a50-03961a6bc3da (PIA 002082026/269, carro 52833, OS 333633)
-- Devolver itens da OS 333633 que foram migrados indevidamente para o chamado destino 26e945d9-345a-40d9-9b74-ed2b40ba183d

DO $$
BEGIN
  -- 1. anexos_chamado_interno: devolver os 6 anexos da OS 333633 / chamado 3b42e336
  UPDATE public.anexos_chamado_interno
  SET chamado_id = '3b42e336-031f-4519-9a50-03961a6bc3da'::uuid
  WHERE id IN (
    'f2f28672-5509-4074-9df5-c2f48441f8ee'::uuid, -- Espelho_Danos_Carro_52833_OS_333633_20260831225243.pdf
    'd7de6126-8140-4c1b-a274-ba6c52c052d8'::uuid, -- Orçamento: 12059 - OS: 333633 - Carro: 52833.PDF
    '114ed09a-b7e3-4797-9c85-53561c9c40a6'::uuid, -- Foto Conserto 01 - Carro: 52833 (os_foto_333633)
    'da614b00-8b9a-4867-b6eb-7146d8dedaf6'::uuid, -- Foto Conserto 02 - Carro: 52833 (os_foto_333633)
    '54309ab7-4dc7-48bb-becf-74f27636c243'::uuid, -- RELATO 52833.pdf
    'fcc902d7-09d5-4e81-9aea-eab5b2b5aaf0'::uuid  -- INTERNA 52833.pdf
  );

  -- 2. documentos: mover documento do Espelho de Danos da OS 333633
  UPDATE public.documentos
  SET chamado_id = '3b42e336-031f-4519-9a50-03961a6bc3da'::uuid
  WHERE id = '2855c7db-bb7b-423f-9e61-2d5d33ad3a96'::uuid;

  -- 3. formularios_espelho_danos: mover formulário do Espelho de Danos da OS 333633
  UPDATE public.formularios_espelho_danos
  SET chamado_id = '3b42e336-031f-4519-9a50-03961a6bc3da'::uuid
  WHERE id = '03c0a91d-fced-407e-a1f2-5b9d2ce24d10'::uuid;

  -- 4. historico_chamado: mover os históricos correspondentes à OS 333633
  UPDATE public.historico_chamado
  SET chamado_id = '3b42e336-031f-4519-9a50-03961a6bc3da'::uuid
  WHERE id IN (
    'aff4d74e-de7e-45d2-a513-0abdc96a9cf4'::uuid, -- atribuido, 01/09
    '01bf506c-00d3-49cd-851e-87173930259e'::uuid, -- respondido "Evidência de manutenção sincronizada...", 01/09
    '2e1cb565-89db-4077-a749-e51d1e7c88bd'::uuid  -- respondido "LANTERNA TLE, COLUNA E PONTEIRA TRASEIRAS L/E DANIFICADAS.", 01/09
  );

  -- 5. Atualização dos chamados:
  -- Origem 3b42e336: status 'unificado' -> 'finalizado', status_aprovacao_alex 'pendente', remover sufixo da unificação
  UPDATE public.chamados
  SET descricao = 'Lanterna traseira lado esquerdo avariado',
      status = 'finalizado',
      status_aprovacao_alex = 'pendente'
  WHERE id = '3b42e336-031f-4519-9a50-03961a6bc3da'::uuid;

  -- Destino 26e945d9: manter status ('em_atendimento') e remover trecho residual da descrição do vistoriador do chamado 269
  UPDATE public.chamados
  SET descricao = REPLACE(descricao, ' --- Descrição do Vistoriador: Lanterna traseira lado esquerdo avariado', '')
  WHERE id = '26e945d9-345a-40d9-9b74-ed2b40ba183d'::uuid;

END $$;
