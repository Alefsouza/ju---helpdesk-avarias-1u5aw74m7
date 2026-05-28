import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useChamadosDashboard() {
  const [chamados, setChamados] = useState<any[]>([])
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [chamadosRes, respRes, respostasRes, historicoRes] = await Promise.all([
        supabase.from('chamados').select('*').order('criado_em', { ascending: false }),
        supabase
          .from('perfil_usuario')
          .select('id, nome_completo')
          .in('tipo_usuario', ['responsavel', 'sinistro', 'admin']),
        supabase.from('respostas_chamado').select('id, chamado_id, criado_em'),
        supabase.from('historico_chamado').select('id, chamado_id, acao, criado_em'),
      ])

      if (chamadosRes.error) throw chamadosRes.error
      if (respRes.error) throw respRes.error

      const allChamados = chamadosRes.data || []

      const extractCarro = (c: any) => {
        if (c.carro) return c.carro.trim().toUpperCase()
        const match = c.titulo?.match(/carro\s+([a-zA-Z0-9_-]+)/i)
        return match ? match[1].toUpperCase() : null
      }

      const allProcessed = allChamados.map((c) => ({
        id: c.id,
        carroExtracted: extractCarro(c),
        dataOcorrenciaDate: c.data_ocorrencia ? c.data_ocorrencia.substring(0, 10) : null,
      }))

      const mapped = allChamados.map((c) => {
        const carro = extractCarro(c)
        const dateCriado = c.criado_em ? c.criado_em.substring(0, 10) : null

        const is_duplicate = Boolean(
          carro &&
          dateCriado &&
          allProcessed.some((other) => {
            return (
              other.id !== c.id &&
              other.carroExtracted === carro &&
              other.dataOcorrenciaDate === dateCriado
            )
          }),
        )

        return {
          ...c,
          responsavel: (respRes.data || []).find((r) => r.id === c.responsavel_id) || null,
          respostas: (respostasRes.data || []).filter((r) => r.chamado_id === c.id),
          historico: (historicoRes.data || []).filter((h) => h.chamado_id === c.id),
          is_duplicate,
        }
      })

      setChamados(mapped)
      setResponsaveis(respRes.data || [])
      setError(false)
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () =>
        fetchData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'respostas_chamado' }, () =>
        fetchData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historico_chamado' }, () =>
        fetchData(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { chamados, responsaveis, loading, error, refetch: fetchData }
}
