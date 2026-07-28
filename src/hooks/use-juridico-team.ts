import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { JURIDICO_TEAM_EMAILS } from '@/lib/juridico-access'

export function useJuridicoTeam() {
  const [userIds, setUserIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchIds = async () => {
      try {
        const { data } = await supabase
          .from('perfil_usuario')
          .select('id')
          .in('email', JURIDICO_TEAM_EMAILS)
        if (mounted) {
          setUserIds((data || []).map((u) => u.id))
        }
      } catch (e) {
        console.error('Erro ao buscar IDs do time jurídico', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchIds()
    return () => {
      mounted = false
    }
  }, [])

  return { juridicoUserIds: userIds, loading }
}
