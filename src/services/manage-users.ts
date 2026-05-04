import { supabase } from '@/lib/supabase/client'

export const createAdminUser = async (data: {
  email: string
  nome_completo: string
  tipo_usuario: string
}) => {
  return await supabase.functions.invoke('manage-users', {
    body: { action: 'create', ...data },
  })
}

export const deleteAdminUser = async (userId: string) => {
  return await supabase.functions.invoke('manage-users', {
    body: { action: 'delete', userId },
  })
}
