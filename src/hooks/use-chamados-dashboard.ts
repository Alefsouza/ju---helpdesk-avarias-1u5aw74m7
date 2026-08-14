import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { subDays, isBefore, isAfter } from 'date-fns'
import { isDuplicateTicket } from '@/lib/utils'

export type ChartFilters = {
  status?: string[]
  prioridade?: string[]
  garagem?: string[]
  responsavel?: string[]
  data?: string[]
  overdue?: boolean
  situacao?: string[]
}

export type ChamadosFilters = {
  search: string
  status: string
  situacaoProcesso: string
  statusInterno: string
  responsavel: string
  period: string
  dateRange: { from?: Date; to?: Date } | undefined
  chartFilters: ChartFilters
}

function applyChartFilters(data: any[], cf: ChartFilters): any[] {
  return data.filter((c) => {
    if (cf.status?.length && !cf.status.includes(c.status)) return false
    if (cf.prioridade?.length && !cf.prioridade.includes(c.prioridade)) return false
    if (cf.garagem?.length) {
      const g = c.garagem || 'Não Informada'
      if (!cf.garagem.includes(g)) return false
    }
    if (cf.responsavel?.length) {
      const r = c.responsavel?.id || 'unassigned'
      if (!cf.responsavel.includes(r)) return false
    }
    if (cf.situacao?.length) {
      if (!c.situacao_processo || !cf.situacao.includes(c.situacao_processo)) return false
    }
    if (cf.data?.length) {
      if (!c.criado_em || !cf.data.includes(c.criado_em.substring(0, 10))) return false
    }
    if (cf.overdue) {
      if (c.status === 'finalizado') return false
      if (!isBefore(new Date(c.criado_em), subDays(new Date(), 30))) return false
    }
    return true
  })
}

function applyTableFilters(data: any[], f: ChamadosFilters): any[] {
  return data.filter((c) => {
    if (f.search) {
      const s = f.search.toLowerCase()
      if (
        !c.titulo?.toLowerCase().includes(s) &&
        !c.id?.toLowerCase().includes(s) &&
        !c.nome_usuario?.toLowerCase().includes(s) &&
        !c.pia?.toLowerCase().includes(s) &&
        !c.registro_motorista?.toLowerCase().includes(s) &&
        !c.nome_motorista?.toLowerCase().includes(s)
      ) {
        return false
      }
    }
    if (f.status !== 'all' && c.status !== f.status) return false
    if (f.situacaoProcesso !== 'all' && c.situacao_processo !== f.situacaoProcesso) return false
    if (f.statusInterno !== 'all' && c.status_interno !== f.statusInterno) return false
    if (f.responsavel !== 'all') {
      if (f.responsavel === 'unassigned') {
        if (c.responsavel?.id) return false
      } else if (c.responsavel?.id !== f.responsavel) return false
    }
    if (f.period !== 'all' && c.criado_em) {
      const d = new Date(c.criado_em)
      const now = new Date()
      if (f.period === '7' && !isAfter(d, subDays(now, 7))) return false
      if (f.period === '30' && !isAfter(d, subDays(now, 30))) return false
      if (f.period === '90' && !isAfter(d, subDays(now, 90))) return false
      if (f.period === 'custom' && f.dateRange) {
        if (f.dateRange.from && isBefore(d, f.dateRange.from)) return false
        if (f.dateRange.to) {
          const t = new Date(f.dateRange.to)
          t.setHours(23, 59, 59, 999)
          if (isAfter(d, t)) return false
        }
      }
    }
    return true
  })
}

export const useChamadosDashboard = (filters: ChamadosFilters) => {
  const [chamados, setChamados] = useState<any[]>([])
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [chamRes, respRes, espRes] = await Promise.all([
          supabase.from('chamados').select('*').order('criado_em', { ascending: false }),
          supabase
            .from('perfil_usuario')
            .select('id, nome_completo')
            .order('nome_completo', { ascending: true }),
          supabase
            .from('formularios_espelho_danos')
            .select('chamado_id, registro_motorista, nome_motorista'),
        ])
        if (cancelled) return
        if (chamRes.error) throw chamRes.error
        if (respRes.error) throw respRes.error
        if (espRes.error) throw espRes.error
        const perfilMap = new Map((respRes.data || []).map((p) => [p.id, p]))
        // Mapa de espelho de danos por chamado_id (primeiro registro encontrado),
        // usado para complementar registro_motorista/nome_motorista ausentes no chamado.
        const espelhoMap = new Map<
          string,
          { registro_motorista?: string | null; nome_motorista?: string | null }
        >()
        for (const e of espRes.data || []) {
          if (e.chamado_id && !espelhoMap.has(e.chamado_id)) {
            espelhoMap.set(e.chamado_id, {
              registro_motorista: e.registro_motorista,
              nome_motorista: e.nome_motorista,
            })
          }
        }
        const enriched = (chamRes.data || []).map((c) => {
          const creator = perfilMap.get(c.usuario_id)
          const espelho = espelhoMap.get(c.id)
          return {
            ...c,
            responsavel: perfilMap.get(c.responsavel_id) || null,
            nome_usuario: creator?.nome_completo || '',
            registro_motorista: c.registro_motorista || espelho?.registro_motorista || null,
            nome_motorista: c.nome_motorista || espelho?.nome_motorista || null,
            is_duplicate: isDuplicateTicket(c, chamRes.data || []),
          }
        })
        const tableFiltered = applyTableFilters(enriched, filters)
        const chartFiltered = applyChartFilters(tableFiltered, filters.chartFilters || {})
        setChamados(chartFiltered)
        setResponsaveis(respRes.data || [])
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Erro ao carregar dados')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [
    filters.search,
    filters.status,
    filters.situacaoProcesso,
    filters.statusInterno,
    filters.responsavel,
    filters.period,
    filters.dateRange,
    filters.chartFilters,
    refreshKey,
  ])

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1)
    window.addEventListener('dashboard_realtime_update', handler)
    return () => window.removeEventListener('dashboard_realtime_update', handler)
  }, [])

  return { chamados, responsaveis, loading, error, refetch }
}
