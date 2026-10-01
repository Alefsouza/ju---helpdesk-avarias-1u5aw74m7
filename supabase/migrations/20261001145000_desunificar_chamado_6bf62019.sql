-- Desunificação do chamado 6bf62019-2994-46e4-a775-f8b1c3f1ada9
-- Devolver itens da OS 334673 que foram migrados indevidamente para o chamado destino 26e945d9-345a-40d9-9b74-ed2b40ba183d

DO $$
BEGIN
  -- 1. anexos_chamado_interno: mover os 5 anexos pertencentes à OS 334673
  UPDATE public.anexos_chamado_interno
  SET chamado_id = '6bf62019-2994-46e4-a775-f8b1c3f1ada9'::uuid
  WHERE id IN (
    'b8748415-7854-4076-9cd6-2efcf644c6aa'::uuid, -- Espelho_Danos_Carro_52833_OS_334673_20260909003532.pdf
    'f7549483-4687-44e4-adbf-0b3be6050a8b'::uuid, -- Orçamento: 12179 - OS: 334673 - Carro: 52833.PDF
    'e200c04b-a6ec-4a69-bfdc-4e2a2e628100'::uuid, -- Foto Conserto 03 - Carro: 52833 (os_foto_334673)
    'a1e70191-6325-4c51-8246-99130c2c7c80'::uuid, -- Foto Conserto 02 - Carro: 52833 (os_foto_334673)
    '644571f9-a7eb-4dc0-ab50-bef337474a57'::uuid  -- Foto Conserto 01 - Carro: 52833 (os_foto_334673)
  );

  -- 2. documentos: mover documento do Espelho de Danos da OS 334673
  UPDATE public.documentos
  SET chamado_id = '6bf62019-2994-46e4-a775-f8b1c3f1ada9'::uuid
  WHERE id = '1030ffbb-3665-4cd2-beca-7f7e73d5da85'::uuid;

  -- 3. formularios_espelho_danos: mover espelho de danos da OS 334673
  UPDATE public.formularios_espelho_danos
  SET chamado_id = '6bf62019-2994-46e4-a775-f8b1c3f1ada9'::uuid
  WHERE id = '816cec78-9177-495b-a91c-c22ee81d1284'::uuid;

  -- 4. historico_chamado: mover os históricos correspondentes à OS 334673
  UPDATE public.historico_chamado
  SET chamado_id = '6bf62019-2994-46e4-a775-f8b1c3f1ada9'::uuid
  WHERE id IN (
    '850a5b7d-9c47-4e2b-9b67-c6317b919b06'::uuid, -- atribuido, 09/09
    '6585be08-1f7a-40b7-87af-f104ee4f5b17'::uuid, -- respondido "Evidência de manutenção sincronizada..." 19/09
    'd09e1471-c5cb-492a-a8ce-530805ca573f'::uuid  -- respondido "LANTERNA DE SETA LED TLE QUEBRADA." 21/09
  );

  -- 5. Limpeza das descrições dos chamados:
  -- Origem 6bf62019: remover o sufixo da unificação [SISTEMA]... mantendo a descrição original
  UPDATE public.chamados
  SET descricao = 'Olho do vigia lado esquerdo avariado',
      status = 'finalizado',
      status_aprovacao_alex = 'pendente'
  WHERE id = '6bf62019-2994-46e4-a775-f8b1c3f1ada9'::uuid;

  -- Destino 26e945d9: remover o trecho do chamado de origem (" --- Descrição do Vistoriador: Olho do vigia lado esquerdo avariado")
  -- preservando a descrição de Terceiros e o trecho do chamado 269 (" --- Descrição do Vistoriador: Lanterna traseira lado esquerdo avariado")
  UPDATE public.chamados
  SET descricao = REPLACE(descricao, ' --- Descrição do Vistoriador: Olho do vigia lado esquerdo avariado', '')
  WHERE id = '26e945d9-345a-40d9-9b74-ed2b40ba183d'::uuid;

END $$;
