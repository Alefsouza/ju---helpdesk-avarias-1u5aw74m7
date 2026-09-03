import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  Search,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
} from 'lucide-react'
import {
  format,
  subDays,
  startOfMonth,
  startOfYear,
  isAfter,
  isBefore,
  parseISO,
  differenceInHours,
} from 'date-fns'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { Link, Navigate } from 'react-router-dom'

type FilterState = {
  period: string
  startDate: string
  endDate: string
  status: string
  priority: string
  assignee: string
  search: string
}

const defaultFilters: FilterState = {
  period: '30d',
  startDate: '',
  endDate: '',
  status: 'todos',
  priority: 'todos',
  assignee: 'todos',
  search: '',
}

type CardFilterKey = 'resolucao' | 'orcamentos' | 'cobrado' | 'falta'

type Chamado = {
  id: string
  titulo: string
  status: string
  prioridade: string
  criado_em: string
  atualizado_em: string
  responsavel_id: string | null
  perfil_usuario?: { nome_completo: string } | null
}

export default function Relatorios() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters)

  const [data, setData] = useState<Chamado[]>([])
  const [assignees, setAssignees] = useState<{ id: string; nome_completo: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [orcamentoTotals, setOrcamentoTotals] = useState({
    totalOrcamentos: 0,
    orcamentoCobrado: 0,
    quantoFalta: 0,
  })

  const [valeChamadoIds, setValeChamadoIds] = useState<Set<string>>(new Set())
  const [activeParcelaChamadoIds, setActiveParcelaChamadoIds] = useState<Set<string>>(new Set())
  const [chamadoValorMap, setChamadoValorMap] = useState<Map<string, number>>(new Map())

  const [activeCardFilters, setActiveCardFilters] = useState<Set<CardFilterKey>>(new Set())
  const [activeResponsavelFilters, setActiveResponsavelFilters] = useState<Set<string>>(new Set())

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Chamado | 'tempo' | 'valor_orcamento'
    direction: 'asc' | 'desc'
  }>({ key: 'criado_em', direction: 'desc' })
  const [page, setPage] = useState(1)
  const itemsPerPage = 20

  const checkAdmin = useCallback(async () => {
    if (!user) return
    const { data: profile } = await supabase
      .from('perfil_usuario')
      .select('tipo_usuario')
      .eq('id', user.id)
      .single()
    setIsAdmin(profile?.tipo_usuario === 'admin')
  }, [user])

  const fetchAssignees = async () => {
    const { data: chamados } = await supabase
      .from('chamados')
      .select('responsavel_id')
      .not('responsavel_id', 'is', null)

    if (!chamados || chamados.length === 0) {
      setAssignees([])
      return
    }

    const assignedIds = Array.from(new Set(chamados.map((c) => c.responsavel_id as string)))

    const { data } = await supabase
      .from('perfil_usuario')
      .select('id, nome_completo')
      .in('id', assignedIds)

    if (data) {
      setAssignees(data.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)))
    }
  }

  const fetchData = useCallback(async () => {
    if (isAdmin === false) return
    setLoading(true)
    setError(false)
    try {
      const { data: chamadosData, error: fetchError } = await supabase
        .from('chamados')
        .select('id, titulo, status, prioridade, criado_em, atualizado_em, responsavel_id')
        .order('criado_em', { ascending: false })

      if (fetchError) throw fetchError

      const { data: perfisData, error: perfisError } = await supabase
        .from('perfil_usuario')
        .select('id, nome_completo')

      if (perfisError) throw perfisError

      const perfisMap = new Map(perfisData.map((p) => [p.id, p]))

      const combinedData = chamadosData.map((chamado) => ({
        ...chamado,
        perfil_usuario: chamado.responsavel_id ? perfisMap.get(chamado.responsavel_id) : null,
      }))

      setData(combinedData as unknown as Chamado[])
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    checkAdmin()
    fetchAssignees()
  }, [checkAdmin])

  useEffect(() => {
    if (isAdmin) fetchData()
  }, [isAdmin, fetchData])

  const fetchOrcamentoTotals = useCallback(async () => {
    const { data: docData } = await supabase
      .from('documentos')
      .select('chamado_id, valor_orcamento')
      .eq('tipo_documento', 'Vale')
      .gte('criado_em', '2026-08-01T00:00:00+00:00')

    const valeIds = new Set<string>()
    const docByChamado = new Map<string, number>()
    const totalOrcamentos = (docData || []).reduce((sum, d) => {
      if (d.chamado_id) {
        valeIds.add(d.chamado_id)
        if (d.valor_orcamento != null) {
          docByChamado.set(d.chamado_id, (docByChamado.get(d.chamado_id) || 0) + d.valor_orcamento)
        }
      }
      return sum + (d.valor_orcamento || 0)
    }, 0)
    setValeChamadoIds(valeIds)

    const { data: parcelaData } = await supabase
      .from('parcelas_vales')
      .select('chamado_id, valor_parcela')
      .eq('status', 'ativo')

    const activeIds = new Set<string>()
    const parcelasByChamado = new Map<string, number>()
    const orcamentoCobrado = (parcelaData || []).reduce((sum, p) => {
      if (p.chamado_id) {
        activeIds.add(p.chamado_id)
        parcelasByChamado.set(
          p.chamado_id,
          (parcelasByChamado.get(p.chamado_id) || 0) + (p.valor_parcela || 0),
        )
      }
      return sum + (p.valor_parcela || 0)
    }, 0)
    setActiveParcelaChamadoIds(activeIds)

    const valorMap = new Map<string, number>()
    docByChamado.forEach((val, chamadoId) => valorMap.set(chamadoId, val))
    parcelasByChamado.forEach((val, chamadoId) => valorMap.set(chamadoId, val))
    setChamadoValorMap(valorMap)

    setOrcamentoTotals({
      totalOrcamentos,
      orcamentoCobrado,
      quantoFalta: totalOrcamentos - orcamentoCobrado,
    })
  }, [])

  useEffect(() => {
    if (isAdmin) fetchOrcamentoTotals()
  }, [isAdmin, fetchOrcamentoTotals])

  useEffect(() => {
    if (!isAdmin) return
    const channel = supabase
      .channel('relatorios_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => {
        fetchData()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin, fetchData])

  const handleApplyFilters = () => {
    setAppliedFilters(filters)
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
    setPage(1)
  }

  const toggleCardFilter = (key: CardFilterKey | 'total', ctrl: boolean) => {
    if (key === 'total') {
      setActiveCardFilters(new Set())
      setActiveResponsavelFilters(new Set())
      setPage(1)
      return
    }
    setActiveCardFilters((prev) => {
      const next = new Set(prev)
      if (ctrl) {
        if (next.has(key)) next.delete(key)
        else next.add(key)
      } else {
        if (next.size === 1 && next.has(key)) {
          next.clear()
        } else {
          next.clear()
          next.add(key)
        }
      }
      return next
    })
    if (!ctrl) {
      setActiveResponsavelFilters(new Set())
    }
    setPage(1)
  }

  const toggleResponsavelFilter = (id: string, ctrl: boolean) => {
    setActiveResponsavelFilters((prev) => {
      const next = new Set(prev)
      if (ctrl) {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      } else {
        if (next.size === 1 && next.has(id)) {
          next.clear()
        } else {
          next.clear()
          next.add(id)
        }
      }
      return next
    })
    if (!ctrl) {
      setActiveCardFilters(new Set())
    }
    setPage(1)
  }

  const filteredData = useMemo(() => {
    let result = [...data]

    // Date filter
    const now = new Date()
    let start: Date | null = null
    let end: Date | null = null

    if (appliedFilters.period === '7d') start = subDays(now, 7)
    else if (appliedFilters.period === '30d') start = subDays(now, 30)
    else if (appliedFilters.period === '90d') start = subDays(now, 90)
    else if (appliedFilters.period === 'mes') start = startOfMonth(now)
    else if (appliedFilters.period === 'ano') start = startOfYear(now)
    else if (appliedFilters.period === 'custom') {
      if (appliedFilters.startDate) start = parseISO(appliedFilters.startDate)
      if (appliedFilters.endDate) end = parseISO(appliedFilters.endDate)
    }

    if (start) result = result.filter((item) => isAfter(parseISO(item.criado_em), start!))
    if (end) {
      end.setHours(23, 59, 59, 999)
      result = result.filter((item) => isBefore(parseISO(item.criado_em), end!))
    }

    if (appliedFilters.status !== 'todos') {
      result = result.filter((item) => item.status === appliedFilters.status)
    }
    if (appliedFilters.priority !== 'todos') {
      result = result.filter((item) => item.prioridade === appliedFilters.priority)
    }
    if (appliedFilters.assignee !== 'todos') {
      if (appliedFilters.assignee === 'unassigned')
        result = result.filter((item) => !item.responsavel_id)
      else result = result.filter((item) => item.responsavel_id === appliedFilters.assignee)
    }
    if (appliedFilters.search) {
      const q = appliedFilters.search.toLowerCase()
      result = result.filter(
        (item) => item.id.toLowerCase().includes(q) || item.titulo.toLowerCase().includes(q),
      )
    }

    // Cross-filters: card filters (OR within cards)
    if (activeCardFilters.size > 0) {
      result = result.filter((item) => {
        let matches = false
        for (const key of activeCardFilters) {
          if (key === 'resolucao') {
            if (item.status === 'finalizado') matches = true
          } else if (key === 'orcamentos') {
            if (valeChamadoIds.has(item.id)) matches = true
          } else if (key === 'cobrado') {
            if (activeParcelaChamadoIds.has(item.id)) matches = true
          } else if (key === 'falta') {
            if (valeChamadoIds.has(item.id) && !activeParcelaChamadoIds.has(item.id)) matches = true
          }
        }
        return matches
      })
    }

    // Cross-filters: responsável filters (OR within responsáveis, AND with cards)
    if (activeResponsavelFilters.size > 0) {
      result = result.filter((item) =>
        item.responsavel_id ? activeResponsavelFilters.has(item.responsavel_id) : false,
      )
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof Chamado]
      let valB: any = b[sortConfig.key as keyof Chamado]

      if (sortConfig.key === 'tempo') {
        valA =
          a.status === 'finalizado'
            ? differenceInHours(parseISO(a.atualizado_em), parseISO(a.criado_em))
            : -1
        valB =
          b.status === 'finalizado'
            ? differenceInHours(parseISO(b.atualizado_em), parseISO(b.criado_em))
            : -1
      } else if (sortConfig.key === 'valor_orcamento') {
        valA = chamadoValorMap.get(a.id) ?? -1
        valB = chamadoValorMap.get(b.id) ?? -1
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [
    data,
    appliedFilters,
    sortConfig,
    activeCardFilters,
    activeResponsavelFilters,
    valeChamadoIds,
    activeParcelaChamadoIds,
    chamadoValorMap,
  ])

  const paginatedData = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, page])

  const metrics = useMemo(() => {
    const total = filteredData.length
    const finalizados = filteredData.filter((d) => d.status === 'finalizado')
    const resolutionRate = total > 0 ? (finalizados.length / total) * 100 : 0

    let totalHours = 0
    finalizados.forEach((d) => {
      totalHours += differenceInHours(parseISO(d.atualizado_em), parseISO(d.criado_em))
    })
    const avgTime = finalizados.length > 0 ? totalHours / finalizados.length : 0

    const byAssignee = filteredData.reduce(
      (acc, curr) => {
        const name = curr.perfil_usuario?.nome_completo || 'Não atribuído'
        acc[name] = (acc[name] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return { total, resolutionRate, avgTime, byAssignee }
  }, [filteredData])

  const handleSort = (key: keyof Chamado | 'tempo' | 'valor_orcamento') => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const exportPDF = async () => {
    if (filteredData.length === 0) return toast.error('Não há dados para exportar')

    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      // PÁGINA 1: Título, filtros, métricas resumidas
      doc.setFontSize(16)
      doc.setTextColor(34, 95, 61)
      doc.text('Relatório de Chamados', 14, 20)

      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28)

      doc.setFontSize(12)
      doc.setTextColor(0)
      doc.text('Filtros aplicados:', 14, 38)
      doc.setFontSize(10)
      doc.setTextColor(100)

      let filterText = `Período: ${appliedFilters.period}`
      if (appliedFilters.period === 'custom') {
        filterText += ` (${appliedFilters.startDate} a ${appliedFilters.endDate})`
      }
      filterText += ` | Status: ${appliedFilters.status} | Prioridade: ${appliedFilters.priority}`
      if (appliedFilters.assignee !== 'todos') {
        const assigneeName =
          assignees.find((a) => a.id === appliedFilters.assignee)?.nome_completo ||
          appliedFilters.assignee
        filterText += ` | Responsável: ${assigneeName}`
      }

      doc.text(filterText, 14, 44)

      doc.setFontSize(12)
      doc.setTextColor(0)
      doc.text('Métricas Resumidas:', 14, 56)

      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Total de Chamados: ${metrics.total}`, 14, 64)
      doc.text(`Tempo Médio de Atendimento: ${metrics.avgTime.toFixed(1)} hrs`, 14, 70)
      doc.text(`Taxa de Resolução: ${metrics.resolutionRate.toFixed(1)}%`, 14, 76)

      // PÁGINA 2+: Tabela de chamados (20 linhas por página)
      let pageY = 20
      const rowsPerPage = 20
      const tableColumnX = [14, 30, 85, 115, 135, 155, 175, 195]

      const renderHeaders = () => {
        doc.setFontSize(9)
        doc.setTextColor(34, 95, 61)
        doc.setFont('helvetica', 'bold')
        doc.text('Valor', tableColumnX[0], pageY)
        doc.text('Título', tableColumnX[1], pageY)
        doc.text('Status', tableColumnX[2], pageY)
        doc.text('Prior.', tableColumnX[3], pageY)
        doc.text('Resp.', tableColumnX[4], pageY)
        doc.text('Criação', tableColumnX[5], pageY)
        doc.text('Fin.', tableColumnX[6], pageY)
        doc.text('Hrs', tableColumnX[7], pageY)
        doc.line(14, pageY + 2, 200, pageY + 2)
        pageY += 8
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100)
      }

      for (let i = 0; i < filteredData.length; i++) {
        if (i % rowsPerPage === 0) {
          doc.addPage()
          pageY = 20
          renderHeaders()
        }

        const d = filteredData[i]
        const isFinished = d.status === 'finalizado'
        const time = isFinished
          ? differenceInHours(parseISO(d.atualizado_em), parseISO(d.criado_em))
          : '-'

        const valorOrc = chamadoValorMap.get(d.id)
        const valorStr =
          valorOrc != null
            ? valorOrc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : '-'
        const titulo = d.titulo.substring(0, 25) + (d.titulo.length > 25 ? '...' : '')
        const status = d.status.replace('_', ' ')
        const prioridade = d.prioridade
        const resp =
          (d.perfil_usuario?.nome_completo || 'Não atribuído').substring(0, 10) +
          ((d.perfil_usuario?.nome_completo?.length || 0) > 10 ? '...' : '')
        const criacao = format(parseISO(d.criado_em), 'dd/MM/yy')
        const fin = isFinished ? format(parseISO(d.atualizado_em), 'dd/MM/yy') : '-'
        const hrs = String(time)

        doc.setFontSize(8)
        doc.text(valorStr, tableColumnX[0], pageY)
        doc.text(titulo, tableColumnX[1], pageY)
        doc.text(status, tableColumnX[2], pageY)
        doc.text(prioridade, tableColumnX[3], pageY)
        doc.text(resp, tableColumnX[4], pageY)
        doc.text(criacao, tableColumnX[5], pageY)
        doc.text(fin, tableColumnX[6], pageY)
        doc.text(hrs, tableColumnX[7], pageY)

        pageY += 7
      }

      const pageCount = (doc.internal as any).getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
          `Página ${i} de ${pageCount} - Gerado pelo Sistema de Helpdesk Via Sudeste em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' },
        )
      }

      doc.save(`relatorio_chamados_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`)
      toast.success('PDF gerado com sucesso')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Erro ao gerar PDF. Tente novamente mais tarde.')
    }
  }

  if (isAdmin === false) return <Navigate to="/dashboard" replace />

  const cardActiveClass =
    'ring-2 ring-[#225f3d] ring-offset-2 ring-offset-white bg-[#f0f7f2] cursor-pointer'
  const cardIdleClass =
    'cursor-pointer hover:ring-1 hover:ring-[#225f3d]/40 hover:ring-offset-1 hover:ring-offset-white transition-all'

  const handleCardClick = (e: React.MouseEvent, key: CardFilterKey | 'total') => {
    e.preventDefault()
    toggleCardFilter(key, e.ctrlKey || e.metaKey)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#225f3d]">Relatórios</h1>
          <p className="text-sm text-slate-500">Análise avançada e exportação de dados</p>
        </div>
        <Button onClick={exportPDF} className="bg-[#225f3d] hover:bg-[#1a4a2f] text-white">
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Filters Area */}
      <div className="bg-[#f0f0f0] border border-[#f0f0f0] rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[#212121] font-medium text-sm mb-2">
          <Filter className="w-4 h-4" /> Filtros Avançados
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Select
            value={filters.period}
            onValueChange={(v) => setFilters((f) => ({ ...f, period: v }))}
          >
            <SelectTrigger className="bg-white border-slate-200 text-[#212121]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="ano">Este ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {filters.period === 'custom' && (
            <div className="flex gap-2 lg:col-span-2">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                className="bg-white text-[#212121]"
              />
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                className="bg-white text-[#212121]"
              />
            </div>
          )}

          <Select
            value={filters.status}
            onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          >
            <SelectTrigger className="bg-white border-slate-200 text-[#212121]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.priority}
            onValueChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
          >
            <SelectTrigger className="bg-white border-slate-200 text-[#212121]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Prioridades</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.assignee}
            onValueChange={(v) => setFilters((f) => ({ ...f, assignee: v }))}
          >
            <SelectTrigger className="bg-white border-slate-200 text-[#212121]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Responsáveis</SelectItem>
              <SelectItem value="unassigned">Não atribuído</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar ID ou Título..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="pl-9 bg-white border-slate-200 text-[#212121]"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="border-slate-300 text-[#212121] hover:bg-slate-100"
          >
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
          <Button
            onClick={handleApplyFilters}
            className="bg-[#225f3d] hover:bg-[#1a4a2f] text-white"
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>

      {/* Metrics Area */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
          <Card
            className={`bg-white border border-[#f0f0f0] shadow-sm ${activeCardFilters.size === 0 && activeResponsavelFilters.size === 0 ? cardIdleClass : cardIdleClass}`}
            onClick={(e) => handleCardClick(e, 'total')}
          >
            <CardContent className="p-6">
              <p className="text-[12px] font-medium text-slate-500 mb-1 uppercase tracking-wider">
                Total de Chamados
              </p>
              <p className="text-[32px] font-semibold text-[#225f3d] leading-none">
                {metrics.total}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Clique para limpar filtros visuais</p>
            </CardContent>
          </Card>
          <Card
            className={`bg-white border border-[#f0f0f0] shadow-sm ${activeCardFilters.has('resolucao') ? cardActiveClass : cardIdleClass}`}
            onClick={(e) => handleCardClick(e, 'resolucao')}
          >
            <CardContent className="p-6">
              <p className="text-[12px] font-medium text-slate-500 mb-1 uppercase tracking-wider">
                Tempo Médio (Hrs)
              </p>
              <p className="text-[32px] font-semibold text-[#225f3d] leading-none">
                {metrics.avgTime.toFixed(1)}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Não filtrável</p>
            </CardContent>
          </Card>
          <Card
            className={`bg-white border border-[#f0f0f0] shadow-sm ${activeCardFilters.has('resolucao') ? cardActiveClass : cardIdleClass}`}
            onClick={(e) => handleCardClick(e, 'resolucao')}
          >
            <CardContent className="p-6">
              <p className="text-[12px] font-medium text-slate-500 mb-1 uppercase tracking-wider">
                Taxa de Resolução
              </p>
              <p className="text-[32px] font-semibold text-[#225f3d] leading-none">
                {metrics.resolutionRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Filtrar finalizados</p>
            </CardContent>
          </Card>
          <Card
            className={`bg-white border border-[#f0f0f0] shadow-sm md:row-span-2 overflow-auto max-h-[250px] md:max-h-full ${activeResponsavelFilters.size > 0 ? 'ring-2 ring-[#225f3d] ring-offset-2 ring-offset-white' : ''}`}
          >
            <CardContent className="p-6">
              <p className="text-[12px] font-medium text-slate-500 mb-4 uppercase tracking-wider">
                Por Responsável
              </p>
              <div className="space-y-3">
                {Object.entries(metrics.byAssignee)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, count]) => {
                    const assignee = assignees.find((a) => a.nome_completo === name)
                    const respId = assignee?.id || null
                    const isActive = respId ? activeResponsavelFilters.has(respId) : false
                    return (
                      <div
                        key={name}
                        onClick={(e) => {
                          if (!respId) return
                          e.preventDefault()
                          toggleResponsavelFilter(respId, e.ctrlKey || e.metaKey)
                        }}
                        className={`flex justify-between items-center text-sm rounded-md px-2 py-1 transition-colors ${
                          respId ? 'cursor-pointer hover:bg-slate-50' : ''
                        } ${isActive ? 'bg-[#c8e6c9] ring-1 ring-[#225f3d]' : ''}`}
                      >
                        <span className="text-[#212121] truncate pr-2">{name}</span>
                        <span className="font-semibold text-[#225f3d] bg-[#c8e6c9] px-2 py-0.5 rounded-full text-xs">
                          {count}
                        </span>
                      </div>
                    )
                  })}
                {Object.keys(metrics.byAssignee).length === 0 && (
                  <p className="text-sm text-slate-400">Nenhum dado</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card
            className={`bg-white border border-[#f0f0f0] shadow-sm ${activeCardFilters.has('orcamentos') ? cardActiveClass : cardIdleClass}`}
            onClick={(e) => handleCardClick(e, 'orcamentos')}
          >
            <CardContent className="p-6">
              <p className="text-[12px] font-medium text-slate-500 mb-1 uppercase tracking-wider">
                Total de Orçamentos
              </p>
              <p className="text-[32px] font-semibold text-[#225f3d] leading-none">
                {orcamentoTotals.totalOrcamentos.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Filtrar chamados com Vale</p>
            </CardContent>
          </Card>
          <Card
            className={`bg-white border border-[#f0f0f0] shadow-sm ${activeCardFilters.has('cobrado') ? cardActiveClass : cardIdleClass}`}
            onClick={(e) => handleCardClick(e, 'cobrado')}
          >
            <CardContent className="p-6">
              <p className="text-[12px] font-medium text-slate-500 mb-1 uppercase tracking-wider">
                Orçamento Cobrado
              </p>
              <p className="text-[32px] font-semibold text-[#e6a817] leading-none">
                {orcamentoTotals.orcamentoCobrado.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Filtrar com parcelas ativas</p>
            </CardContent>
          </Card>
          <Card
            className={`bg-white border border-[#f0f0f0] shadow-sm ${activeCardFilters.has('falta') ? cardActiveClass : cardIdleClass}`}
            onClick={(e) => handleCardClick(e, 'falta')}
          >
            <CardContent className="p-6">
              <p className="text-[12px] font-medium text-slate-500 mb-1 uppercase tracking-wider">
                Quanto Falta Cobrar
              </p>
              <p className="text-[32px] font-semibold text-red-600 leading-none">
                {orcamentoTotals.quantoFalta.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Filtrar pendentes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active cross-filters indicator */}
      {(activeCardFilters.size > 0 || activeResponsavelFilters.size > 0) && (
        <div className="flex flex-wrap items-center gap-2 animate-fade-in">
          <span className="text-xs font-medium text-slate-500">Filtros visuais ativos:</span>
          {Array.from(activeCardFilters).map((key) => (
            <Badge
              key={key}
              variant="outline"
              className="bg-[#c8e6c9] text-[#225f3d] border-[#225f3d] cursor-pointer"
              onClick={() => toggleCardFilter(key, true)}
            >
              {key === 'resolucao' && 'Finalizados'}
              {key === 'orcamentos' && 'Com Vale'}
              {key === 'cobrado' && 'Parcelas ativas'}
              {key === 'falta' && 'Pendentes'}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
          {Array.from(activeResponsavelFilters).map((id) => {
            const a = assignees.find((x) => x.id === id)
            if (!a) return null
            return (
              <Badge
                key={id}
                variant="outline"
                className="bg-[#c8e6c9] text-[#225f3d] border-[#225f3d] cursor-pointer"
                onClick={() => toggleResponsavelFilter(id, true)}
              >
                {a.nome_completo}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )
          })}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-slate-500"
            onClick={() => {
              setActiveCardFilters(new Set())
              setActiveResponsavelFilters(new Set())
            }}
          >
            Limpar filtros visuais
          </Button>
        </div>
      )}

      {/* Table Area */}
      <Card className="bg-white border border-[#f0f0f0] shadow-sm overflow-hidden md:col-span-3">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <div className="text-[#212121] font-medium text-lg">Erro ao carregar relatório</div>
            <Button onClick={fetchData} variant="outline">
              Tentar novamente
            </Button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-2">
              <Filter className="w-8 h-8 text-slate-300" />
            </div>
            <div className="text-[#212121] font-medium text-lg">
              Nenhum chamado encontrado neste período
            </div>
            <p className="text-slate-500 text-sm max-w-sm mb-2">
              Tente ajustar seus filtros para encontrar o que está procurando.
            </p>
            <Button onClick={handleClearFilters} variant="outline" className="border-slate-300">
              Limpar filtros
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#c8e6c9] hover:bg-[#c8e6c9] border-b-0">
                    <TableHead
                      className="text-[#225f3d] font-semibold cursor-pointer min-w-[200px]"
                      onClick={() => handleSort('titulo')}
                    >
                      <div className="flex items-center gap-1">
                        Título <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-[#225f3d] font-semibold cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-[#225f3d] font-semibold cursor-pointer"
                      onClick={() => handleSort('prioridade')}
                    >
                      <div className="flex items-center gap-1">
                        Prioridade <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-[#225f3d] font-semibold cursor-pointer"
                      onClick={() => handleSort('responsavel_id')}
                    >
                      <div className="flex items-center gap-1">
                        Responsável <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-[#225f3d] font-semibold cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('criado_em')}
                    >
                      <div className="flex items-center gap-1">
                        Criação <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-[#225f3d] font-semibold cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('valor_orcamento')}
                    >
                      <div className="flex items-center gap-1">
                        Valor Orçamento <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-[#225f3d] font-semibold cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('tempo')}
                    >
                      <div className="flex items-center gap-1">
                        Tempo (Hrs) <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((c, i) => {
                    const isFinished = c.status === 'finalizado'
                    const hrs = isFinished
                      ? differenceInHours(parseISO(c.atualizado_em), parseISO(c.criado_em))
                      : null
                    return (
                      <TableRow
                        key={c.id}
                        className={
                          i % 2 === 0
                            ? 'bg-white'
                            : 'bg-[#fcfcfc] hover:bg-[#f5f5f5] transition-colors'
                        }
                      >
                        <TableCell className="font-medium truncate max-w-[200px]" title={c.titulo}>
                          <Link
                            to={`/dashboard/chamados/${c.id}`}
                            className="text-[#225f3d] hover:text-[#1a4a2f] hover:underline transition-colors"
                          >
                            {c.titulo}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`
                            ${c.status === 'aberto' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                            ${c.status === 'em_atendimento' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                            ${c.status === 'finalizado' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                          `}
                          >
                            {c.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`
                            ${c.prioridade === 'baixa' ? 'bg-slate-100 text-slate-700 border-slate-200' : ''}
                            ${c.prioridade === 'media' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                            ${c.prioridade === 'alta' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                          `}
                          >
                            {c.prioridade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {c.perfil_usuario?.nome_completo || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                          {format(parseISO(c.criado_em), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-[#225f3d] whitespace-nowrap">
                          {chamadoValorMap.has(c.id)
                            ? (chamadoValorMap.get(c.id) as number).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-[#225f3d]">
                          {hrs !== null ? `${hrs}h` : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t flex items-center justify-between bg-white">
              <span className="text-sm text-slate-500">
                Mostrando {(page - 1) * itemsPerPage + 1} a{' '}
                {Math.min(page * itemsPerPage, filteredData.length)} de {filteredData.length}{' '}
                registros
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * itemsPerPage >= filteredData.length}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
