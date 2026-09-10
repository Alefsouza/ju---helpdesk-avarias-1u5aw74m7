import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Inbox, AlertCircle, ArrowRight, ArrowUpDown, CornerUpLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function OrcamentosDevolvidos() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null,
  )
  const [situacaoFilter, setSituacaoFilter] = useState<string>(
    () => searchParams.get('situacao') || 'Todos',
  )
  const [situacaoOptions, setSituacaoOptions] = useState<string[]>([])

  const isSinistro = profile?.tipo_usuario === 'sinistro'
  const RAQUEL_SINISTRO_EMAIL = 'raquel.santos@viasudeste.com'
  const isRaquelSinistro = user?.email === RAQUEL_SINISTRO_EMAIL
  const userGaragem = profile?.garagem?.trim() || null
  const shouldFilterByGaragem = isSinistro && !isRaquelSinistro

  const defaultWidths: Record<string, number> = {
    pia: 120,
    titulo: 280,
    solicitante: 170,
    motivo: 250,
    colaborador: 170,
    status: 150,
    atualizacao: 150,
    acoes: 100,
  }

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('orcamentos_devolvidos_col_widths')
      return saved ? JSON.parse(saved) : defaultWidths
    } catch {
      return defaultWidths
    }
  })

  const [resizingCol, setResizingCol] = useState<string | null>(null)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(0)

  const onDragStart = (e: React.MouseEvent, colId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingCol(colId)
    setStartX(e.clientX)
    setStartWidth(columnWidths[colId] || defaultWidths[colId] || 150)
  }

  useEffect(() => {
    if (!resizingCol) return

    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX
      const newWidth = Math.max(50, startWidth + diff)

      setColumnWidths((prev) => {
        const updated = { ...prev, [resizingCol]: newWidth }
        localStorage.setItem('orcamentos_devolvidos_col_widths', JSON.stringify(updated))
        return updated
      })
    }

    const onMouseUp = () => {
      setResizingCol(null)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [resizingCol, startX, startWidth])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchDevolvidos = async () => {
    if (!user || !profile) return
    setLoading(true)
    setError(false)
    try {
      // 1. Buscar documentos com is_recusado = true
      const { data: docsRecusados, error: docsErr } = await supabase
        .from('documentos')
        .select('id, chamado_id, numero_os, motivo_recusa, atualizado_em, criado_em')
        .eq('is_recusado', true)

      if (docsErr) throw docsErr

      if (!docsRecusados || docsRecusados.length === 0) {
        setChamados([])
        setLoading(false)
        return
      }

      const explicitChamadoIds = docsRecusados.map((d) => d.chamado_id).filter(Boolean) as string[]

      const osList = docsRecusados
        .filter((d) => !d.chamado_id && d.numero_os)
        .map((d) => d.numero_os?.trim())
        .filter(Boolean) as string[]

      let resolvedChamadoIds = [...explicitChamadoIds]

      if (osList.length > 0) {
        const { data: osChamados } = await supabase
          .from('chamados')
          .select('id, numero_os')
          .in('numero_os', osList)

        if (osChamados) {
          resolvedChamadoIds.push(...osChamados.map((c) => c.id))
        }
      }

      const uniqueChamadoIds = [...new Set(resolvedChamadoIds)]
      if (uniqueChamadoIds.length === 0) {
        setChamados([])
        setLoading(false)
        return
      }

      // Mapa de motivos de recusa e data de devolução pelo chamado_id
      const recusaInfoByChamadoId = new Map<string, { motivo: string; data: string }>()
      docsRecusados.forEach((doc) => {
        if (doc.chamado_id) {
          recusaInfoByChamadoId.set(doc.chamado_id, {
            motivo: doc.motivo_recusa || 'Não informado',
            data: doc.atualizado_em || doc.criado_em,
          })
        }
      })

      // 2. Buscar dados dos chamados correspondentes
      let query = supabase
        .from('chamados')
        .select('*, formularios_espelho_danos(registro_motorista, nome_motorista)')
        .in('id', uniqueChamadoIds)
        .order('atualizado_em', { ascending: false })

      if (shouldFilterByGaragem) {
        if (!userGaragem) {
          setChamados([])
          setLoading(false)
          return
        }
        query = query.eq('garagem', userGaragem)
      }

      const { data: chamadosData, error: chamadosErr } = await query
      if (chamadosErr) throw chamadosErr

      const fetchedData = chamadosData || []

      if (fetchedData.length > 0) {
        const userIds = [
          ...new Set(fetchedData.flatMap((c) => [c.usuario_id, c.responsavel_id]).filter(Boolean)),
        ]

        const { data: perfis } = await supabase
          .from('perfil_usuario')
          .select('id, nome_completo')
          .in('id', userIds)

        const perfilMap = perfis?.reduce(
          (acc, p) => {
            acc[p.id] = p.nome_completo
            return acc
          },
          {} as Record<string, string>,
        )

        const list = fetchedData.map((c) => {
          const info = recusaInfoByChamadoId.get(c.id)
          return {
            ...c,
            nome_usuario: perfilMap?.[c.usuario_id] || 'Usuário Desconhecido',
            nome_responsavel: c.responsavel_id
              ? perfilMap?.[c.responsavel_id] || 'Sem responsável'
              : 'Sem responsável',
            motivo_devolucao: info?.motivo || 'Orçamento recusado para revisão',
            data_devolucao: info?.data || c.atualizado_em,
          }
        })

        setChamados(list)

        const distinctSituacoes = [
          ...new Set(list.map((c) => c.situacao_processo).filter(Boolean)),
        ] as string[]
        setSituacaoOptions(distinctSituacoes)
      } else {
        setChamados([])
      }
    } catch (e: any) {
      console.error(e)
      setError(true)
      toast({
        title: 'Erro ao carregar orçamentos devolvidos',
        description: e.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!profile) return
    fetchDevolvidos()

    const channel = supabase
      .channel('orcamentos_devolvidos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos' }, () => {
        fetchDevolvidos()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => {
        fetchDevolvidos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, profile?.tipo_usuario])

  const navigateToDetails = (id: string) => navigate(`/dashboard/chamados/${id}`)

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' }
        return null
      }
      return { key, direction: 'asc' }
    })
  }

  const filteredChamados = chamados
    .filter((c) => {
      if (situacaoFilter !== 'Todos' && c.situacao_processo !== situacaoFilter) return false
      if (!debouncedSearch) return true
      const term = debouncedSearch.toLowerCase()
      return (
        c.titulo?.toLowerCase().includes(term) ||
        c.pia?.toLowerCase().includes(term) ||
        c.numero_os?.toLowerCase().includes(term) ||
        c.carro?.toLowerCase().includes(term) ||
        c.motivo_devolucao?.toLowerCase().includes(term) ||
        c.nome_usuario?.toLowerCase().includes(term) ||
        (Array.isArray(c.formularios_espelho_danos) &&
          c.formularios_espelho_danos.some(
            (f: any) =>
              f.nome_motorista?.toLowerCase().includes(term) ||
              f.registro_motorista?.toLowerCase().includes(term),
          ))
      )
    })
    .sort((a, b) => {
      if (sortConfig) {
        const aVal = String(a[sortConfig.key] || '').toLowerCase()
        const bVal = String(b[sortConfig.key] || '').toLowerCase()
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      }
      return (
        new Date(b.data_devolucao || b.atualizado_em).getTime() -
        new Date(a.data_devolucao || a.atualizado_em).getTime()
      )
    })

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2 sm:p-4 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Orçamentos Devolvidos
            </h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
              Secretaria Técnica
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">
            Chamados com orçamentos devolvidos para a Secretaria Técnica reenviar. Ao ser reenviado,
            o chamado retorna automaticamente para Atendimentos.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Pesquisar por Título, R.A., OS, Carro ou Motivo..."
            className="pl-9 bg-white shadow-sm max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {situacaoOptions.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Situação do Processo</span>
            <Select
              value={situacaoFilter}
              onValueChange={(value) => {
                setSituacaoFilter(value)
                const params = new URLSearchParams(searchParams)
                if (value === 'Todos') {
                  params.delete('situacao')
                } else {
                  params.set('situacao', value)
                }
                setSearchParams(params, { replace: true })
              }}
            >
              <SelectTrigger className="w-full sm:w-64 bg-white shadow-sm">
                <SelectValue placeholder="Situação do Processo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {situacaoOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">
            Erro ao carregar orçamentos devolvidos
          </h3>
          <p className="text-slate-500 mb-6">Ocorreu um problema ao buscar os registros.</p>
          <Button onClick={fetchDevolvidos}>Tentar novamente</Button>
        </div>
      ) : filteredChamados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
          <Inbox className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">
            Nenhum orçamento devolvido pendente
          </h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Quando um orçamento for devolvido para a Secretaria Técnica corrigir e reenviar, ele
            aparecerá aqui.
          </p>
          <Button onClick={() => navigate('/dashboard/meus-atendimentos')}>
            Ir para Atendimentos
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border bg-white shadow-sm overflow-x-auto w-full relative select-none">
            <Table style={{ tableLayout: 'fixed', minWidth: 'max-content' }} className="w-full">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('pia')}
                    style={{ width: columnWidths.pia }}
                  >
                    <div className="flex items-center gap-1 pr-2">
                      <span className="break-words whitespace-normal">R.A.</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'pia')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('titulo')}
                    style={{ width: columnWidths.titulo }}
                  >
                    <div className="flex items-center gap-1 pr-2">
                      <span className="break-words whitespace-normal">Título / Carro</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'titulo')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('motivo_devolucao')}
                    style={{ width: columnWidths.motivo }}
                  >
                    <div className="flex items-center gap-1 pr-2">
                      <span className="break-words whitespace-normal">Motivo da Devolução</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'motivo')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('nome_responsavel')}
                    style={{ width: columnWidths.colaborador }}
                  >
                    <div className="flex items-center gap-1 pr-2">
                      <span className="break-words whitespace-normal">Responsável</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'colaborador')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('status')}
                    style={{ width: columnWidths.status }}
                  >
                    <div className="flex items-center gap-1 pr-2">
                      <span className="break-words whitespace-normal">Status</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'status')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('data_devolucao')}
                    style={{ width: columnWidths.atualizacao }}
                  >
                    <div className="flex items-center gap-1 pr-2">
                      <span className="break-words whitespace-normal">Data Devolução</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'atualizacao')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative text-right whitespace-nowrap"
                    style={{ width: columnWidths.acoes }}
                  >
                    <div className="pr-2 whitespace-nowrap">Ações</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChamados.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/80 transition-colors py-2">
                    <TableCell className="align-middle">
                      <div
                        className="font-semibold text-slate-700 break-words whitespace-normal"
                        title={c.pia || ''}
                      >
                        {c.pia || '—'}
                      </div>
                    </TableCell>

                    <TableCell className="align-middle">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 break-words whitespace-normal">
                          {c.titulo}
                        </span>
                        {c.carro && (
                          <span className="text-xs text-slate-500 font-mono">Carro: {c.carro}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="align-middle">
                      <div className="flex items-start gap-1.5 max-w-xs">
                        <CornerUpLeft className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-amber-900 line-clamp-2 cursor-help font-medium">
                                {c.motivo_devolucao}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-amber-50 border-amber-200 text-amber-950">
                              <p className="font-bold text-xs mb-1">Motivo da devolução:</p>
                              <p className="text-xs">{c.motivo_devolucao}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>

                    <TableCell className="align-middle text-sm">
                      <div
                        className="font-medium text-slate-700 break-words whitespace-normal"
                        title={c.nome_responsavel}
                      >
                        {c.nome_responsavel}
                      </div>
                    </TableCell>

                    <TableCell className="align-middle">
                      <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                      >
                        AGUARDANDO REENVIO
                      </Badge>
                    </TableCell>

                    <TableCell className="align-middle text-sm text-slate-500 break-words whitespace-normal">
                      {formatDate(c.data_devolucao || c.atualizado_em)}
                    </TableCell>

                    <TableCell className="align-middle text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1 flex-nowrap whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateToDetails(c.id)}
                          title="Abrir Chamado"
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredChamados.map((c) => (
              <Card key={c.id} className="border-slate-200 border-l-4 border-l-amber-500">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-500 mb-1">
                        R.A.: {c.pia || '—'}
                      </div>
                      <h3 className="font-semibold text-slate-900 break-words whitespace-normal">
                        {c.titulo}
                      </h3>
                      {c.carro && (
                        <p className="text-xs text-slate-500 font-mono mt-0.5">Carro: {c.carro}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-amber-100 text-amber-900 border-amber-300 shrink-0"
                    >
                      Aguardando reenvio
                    </Badge>
                  </div>

                  <div className="p-2.5 rounded-md bg-amber-50/80 border border-amber-200 text-xs">
                    <p className="font-semibold text-amber-900 mb-0.5 flex items-center gap-1">
                      <CornerUpLeft className="h-3.5 w-3.5" />
                      Motivo da Devolução:
                    </p>
                    <p className="text-amber-950">{c.motivo_devolucao}</p>
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-md">
                    <div>
                      Responsável:{' '}
                      <span className="font-medium text-slate-700">{c.nome_responsavel}</span>
                    </div>
                    <div>
                      Devolvido em:{' '}
                      <span className="font-medium text-slate-700">
                        {formatDate(c.data_devolucao || c.atualizado_em)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex justify-end">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigateToDetails(c.id)}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Abrir Chamado
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
