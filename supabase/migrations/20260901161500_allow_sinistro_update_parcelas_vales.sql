-- Permite que tipo_usuario = 'sinistro' possa fazer UPDATE na tabela parcelas_vales
-- para suportar o cancelamento lógico de parcelas anteriores ao gerar um novo vale,
-- mantendo as permissões existentes para DP, Diretoria e admin.

DO $$
BEGIN
  DROP POLICY IF EXISTS "parcelas_vales_update" ON public.parcelas_vales;
END $$;

CREATE POLICY "parcelas_vales_update" ON public.parcelas_vales
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfil_usuario
    WHERE id = auth.uid()
    AND (
      departamento IN ('DP', 'Diretoria')
      OR tipo_usuario IN ('admin', 'sinistro')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfil_usuario
    WHERE id = auth.uid()
    AND (
      departamento IN ('DP', 'Diretoria')
      OR tipo_usuario IN ('admin', 'sinistro')
    )
  )
);
