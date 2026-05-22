import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { deleteAdminUser } from '@/services/manage-users'

export function useGestaoEquipe() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('perfil_usuario')
      .select('*')
      .in('tipo_usuario', ['responsavel', 'admin', 'vistoriador', 'coc', 'sos', 'juridico'])
      .order('criado_em', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const toggleActive = async (u: any) => {
    const newStatus = !u.ativo
    const { error } = await supabase
      .from('perfil_usuario')
      .update({ ativo: newStatus })
      .eq('id', u.id)
    if (error) toast.error('Erro ao alterar status')
    else {
      toast.success(`Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso`)
      loadUsers()
    }
  }

  const handleDelete = async (u: any) => {
    if (
      !window.confirm(
        'Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.',
      )
    )
      return
    try {
      const { data, error } = await deleteAdminUser(u.id)
      if (error || data?.error) throw error || new Error(data?.error)
      toast.success('Usuário deletado com sucesso')
      loadUsers()
    } catch (err) {
      toast.error('Erro ao deletar usuário')
    }
  }

  return { users, loading, loadUsers, toggleActive, handleDelete }
}
