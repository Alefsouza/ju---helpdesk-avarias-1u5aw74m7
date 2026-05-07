-- Parte 1: Configurar bucket como público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'documentos';

-- Parte 2: Configurar RLS do bucket
DROP POLICY IF EXISTS "Permitir leitura pública" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública para documentos" ON storage.objects;

-- Criar política para SELECT permitindo acesso público aos arquivos deste bucket
CREATE POLICY "Permitir leitura pública" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'documentos');
