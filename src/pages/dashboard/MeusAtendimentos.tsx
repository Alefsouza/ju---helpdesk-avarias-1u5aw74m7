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
import {
  Search,
  Inbox,
  AlertCircle,
  ArrowRight,
  Check,
  ArrowUpDown,
  RotateCcw,
  Link as LinkIcon,
  AlertTriangle,
} from 'lucide-react'
import { UnificarChamadoModal } from '@/components/UnificarChamadoModal'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function MeusAtendimentos() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [chamados, setChamados] = useState<any[]>([])
  const [unificarChamado, setUnificarChamado] = useState<{
    id: string
    titulo: string
    pia?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [confirmFinalizarId, setConfirmFinalizarId] = useState<string | null>(null)
  const [confirmReabrirId, setConfirmReabrirId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null,
  )

  useEffect(() => {
    if (user) {
      supabase
        .from('perfil_usuario')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setCurrentUserProfile(data)
        })
    }
  }, [user])

  const isSupport =
    currentUserProfile?.tipo_usuario === 'responsavel' ||
    currentUserProfile?.tipo_usuario === 'sinistro' ||
    currentUserProfile?.tipo_usuario === 'admin' ||
    currentUserProfile?.tipo_usuario === 'juridico'

  const defaultWidths: Record<string, number> = {
    pia: 120,
    titulo: 300,
    solicitante: 180,
    prioridade: 120,
    colaborador: 180,
    status: 160,
    atualizacao: 160,
    acoes: 140,
  }

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('atendimentos_col_widths')
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
        localStorage.setItem('atendimentos_col_widths', JSON.stringify(updated))
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

  const fetchChamados = async () => {
    if (!user) return
    setLoading(true)
    setError(false)
    try {
      const { data, error: err } = await supabase
        .from('chamados')
        .select('*')
        .in('status', ['em_atendimento', 'aberto'])
        .order('criado_em', { ascending: false })

      if (err) throw err

      if (data && data.length > 0) {
        const userIds = [
          ...new Set(data.flatMap((c) => [c.usuario_id, c.responsavel_id]).filter(Boolean)),
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

        const { data: allChamadosForDups } = await supabase
          .from('chamados')
          .select('id, carro, titulo, data_ocorrencia')

        const extractCarro = (c: any) => {
          if (c.carro) return c.carro.trim().toUpperCase()
          const match = c.titulo?.match(/carro\s+([a-zA-Z0-9_-]+)/i)
          return match ? match[1].toUpperCase() : null
        }

        const allProcessed = (allChamadosForDups || []).map((c) => ({
          id: c.id,
          carroExtracted: extractCarro(c),
          dataOcorrenciaDate: c.data_ocorrencia ? c.data_ocorrencia.substring(0, 10) : null,
        }))

        const duplicatesSet = new Set<string>()
        data.forEach((c) => {
          const carro = extractCarro(c)
          const dateCriado = c.criado_em ? c.criado_em.substring(0, 10) : null

          if (carro && dateCriado) {
            const hasDuplicate = allProcessed.some(
              (other) =>
                other.id !== c.id &&
                other.carroExtracted === carro &&
                other.dataOcorrenciaDate === dateCriado,
            )
            if (hasDuplicate) {
              duplicatesSet.add(c.id)
            }
          }
        })

        const chamadosComNome = data.map((c) => ({
          ...c,
          nome_usuario: perfilMap?.[c.usuario_id] || 'Usuário Desconhecido',
          nome_responsavel: c.responsavel_id
            ? perfilMap?.[c.responsavel_id] || 'Sem responsável'
            : 'Sem responsável',
          is_duplicate: duplicatesSet.has(c.id),
        }))

        setChamados(chamadosComNome)
      } else {
        setChamados([])
      }
    } catch (e) {
      console.error(e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChamados()

    const channel = supabase
      .channel('meus_atendimentos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => {
        fetchChamados()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleReabrir = async (chamadoId: string) => {
    setCompletingId(chamadoId)
    setConfirmReabrirId(null)
    try {
      const { data, error: updateError } = await supabase
        .from('chamados')
        .update({
          status: 'aberto',
          responsavel_id: user?.id,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', chamadoId)
        .select()
        .single()

      if (updateError) throw updateError
      if (!data) throw new Error('Falha ao atualizar chamado no banco')

      const { error: histError } = await supabase
        .from('historico_chamado')
        .insert({ chamado_id: chamadoId, usuario_id: user?.id, acao: 'reaberto' })

      if (histError) throw histError

      toast({ title: 'Chamado reaberto com sucesso!' })
      setChamados((prev) =>
        prev.map((c) =>
          c.id === chamadoId ? { ...c, status: 'aberto', responsavel_id: user?.id } : c,
        ),
      )

      navigate(`/dashboard/chamados/${chamadoId}`)
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao reabrir chamado', variant: 'destructive' })
    } finally {
      setCompletingId(null)
    }
  }

  const handleFinalizar = async (chamadoId: string) => {
    setCompletingId(chamadoId)
    setConfirmFinalizarId(null)
    try {
      const { error: updateError } = await supabase
        .from('chamados')
        .update({ status: 'finalizado', atualizado_em: new Date().toISOString() })
        .eq('id', chamadoId)

      if (updateError) throw updateError

      const { error: histError } = await supabase
        .from('historico_chamado')
        .insert({ chamado_id: chamadoId, usuario_id: user?.id, acao: 'finalizado' })

      if (histError) throw histError

      toast({ title: 'Chamado finalizado com sucesso!' })
      setChamados((prev) => prev.filter((c) => c.id !== chamadoId))
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao finalizar chamado', variant: 'destructive' })
    } finally {
      setCompletingId(null)
    }
  }

  const navigateToDetails = (id: string) => navigate(`/dashboard/chamados/${id}`)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const PriorityBadge = ({ priority }: { priority: string | null }) => {
    if (!priority)
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">
          NÃO DEFINIDA
        </Badge>
      )
    const colors: Record<string, string> = {
      alta: 'bg-red-100 text-red-800 border-red-200',
      media: 'bg-orange-100 text-orange-800 border-orange-200',
      baixa: 'bg-slate-100 text-slate-800 border-slate-200',
      urgente: 'bg-red-600 text-white border-red-700',
    }
    return (
      <Badge variant="outline" className={colors[priority] || ''}>
        {priority.toUpperCase()}
      </Badge>
    )
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
      if (!debouncedSearch) return true
      const term = debouncedSearch.toLowerCase()
      return (
        c.titulo?.toLowerCase().includes(term) ||
        c.pia?.toLowerCase().includes(term) ||
        c.nome_usuario?.toLowerCase().includes(term)
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

      const aIsMine = a.responsavel_id === user?.id
      const bIsMine = b.responsavel_id === user?.id

      if (aIsMine && !bIsMine) return -1
      if (!aIsMine && bIsMine) return 1

      return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    })

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2 sm:p-4 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Atendimentos</h1>
          <p className="text-slate-500">
            Acompanhe todos os chamados que estão atualmente em atendimento.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Pesquisar por Solicitante, R.A. ou Título..."
            className="pl-9 bg-white shadow-sm max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
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
          <h3 className="text-lg font-medium text-slate-900">Erro ao carregar chamados</h3>
          <p className="text-slate-500 mb-6">Ocorreu um problema ao buscar seus atendimentos.</p>
          <Button onClick={fetchChamados}>Tentar novamente</Button>
        </div>
      ) : filteredChamados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
          <Inbox className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Nenhum atendimento encontrado</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Não há chamados correspondentes aos filtros selecionados no momento.
          </p>
          <Button onClick={() => navigate('/dashboard/chamados-abertos')}>
            Ir para Fila de Atendimento
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
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate">R.A.</span>
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
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate">Título</span>
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
                    onClick={() => handleSort('nome_usuario')}
                    style={{ width: columnWidths.solicitante }}
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate">Solicitante</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'solicitante')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('prioridade')}
                    style={{ width: columnWidths.prioridade }}
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate">Prioridade</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'prioridade')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('nome_responsavel')}
                    style={{ width: columnWidths.colaborador }}
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate">Colaborador</span>
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
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate">Status</span>
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
                    onClick={() => handleSort('atualizado_em')}
                    style={{ width: columnWidths.atualizacao }}
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate whitespace-nowrap">Última Atualização</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'atualizacao')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead className="relative text-right" style={{ width: columnWidths.acoes }}>
                    <div className="pr-2">Ações</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChamados.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/80 transition-colors h-[60px]">
                    <TableCell className="align-middle">
                      <div
                        className="line-clamp-2 font-semibold text-slate-700"
                        title={c.pia || ''}
                      >
                        {c.pia || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="flex items-center gap-2">
                        <div className="line-clamp-2 font-medium text-slate-900" title={c.titulo}>
                          {c.titulo}
                        </div>
                        {c.is_duplicate && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Potencial duplicidade: Existe outro chamado para este veículo onde
                                  a data de ocorrência coincide com a data de criação deste
                                  registro.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle text-sm">
                      <div
                        className="line-clamp-2 font-medium text-slate-700"
                        title={c.nome_usuario}
                      >
                        {c.nome_usuario}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <PriorityBadge priority={c.prioridade} />
                    </TableCell>
                    <TableCell className="align-middle text-sm">
                      <div
                        className="line-clamp-2 font-medium text-slate-700"
                        title={c.nome_responsavel}
                      >
                        {c.nome_responsavel}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge
                        variant="outline"
                        className={
                          c.status === 'finalizado'
                            ? 'bg-slate-100 text-slate-800 border-slate-200'
                            : c.status === 'aberto'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }
                      >
                        {c.status === 'finalizado'
                          ? 'FINALIZADO'
                          : c.status === 'aberto'
                            ? 'ABERTO'
                            : 'EM ATENDIMENTO'}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(c.atualizado_em)}
                    </TableCell>
                    <TableCell className="align-middle text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateToDetails(c.id)}
                          title="Abrir Atendimento"
                          className="px-2"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        {c.responsavel_id === user?.id && c.status !== 'finalizado' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmFinalizarId(c.id)
                            }}
                            disabled={completingId === c.id}
                            title="Finalizar"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {c.status === 'finalizado' && isSupport && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmReabrirId(c.id)
                            }}
                            disabled={completingId === c.id}
                            title="Reabrir Chamado"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {c.status !== 'finalizado' && isSupport && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              setUnificarChamado({ id: c.id, titulo: c.titulo, pia: c.pia })
                            }}
                            disabled={completingId === c.id}
                            title="Unificar Chamado"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                        )}
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
              <Card key={c.id} className="border-slate-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                        R.A.: {c.pia || '—'}
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 line-clamp-1">{c.titulo}</h3>
                        {c.is_duplicate && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Potencial duplicidade: Existe outro chamado para este veículo onde
                                  a data de ocorrência coincide com a data de criação deste
                                  registro.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <PriorityBadge priority={c.prioridade} />
                    <Badge
                      variant="outline"
                      className={
                        c.status === 'finalizado'
                          ? 'bg-slate-100 text-slate-800 border-slate-200'
                          : c.status === 'aberto'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }
                    >
                      {c.status === 'finalizado'
                        ? 'FINALIZADO'
                        : c.status === 'aberto'
                          ? 'ABERTO'
                          : 'EM ATENDIMENTO'}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-slate-500 bg-slate-50 p-2 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700 truncate mr-2">
                        Solicitante: {c.nome_usuario}
                      </span>
                      <span className="whitespace-nowrap">{formatDate(c.atualizado_em)}</span>
                    </div>
                    <div className="font-medium text-slate-700 truncate">
                      Colaborador: {c.nome_responsavel}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigateToDetails(c.id)}
                      title="Abrir Atendimento"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    {c.responsavel_id === user?.id && c.status !== 'finalizado' && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmFinalizarId(c.id)
                        }}
                        disabled={completingId === c.id}
                        title="Finalizar"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {c.status === 'finalizado' && isSupport && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmReabrirId(c.id)
                        }}
                        disabled={completingId === c.id}
                        title="Reabrir Chamado"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    {c.status !== 'finalizado' && isSupport && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setUnificarChamado({ id: c.id, titulo: c.titulo, pia: c.pia })
                        }}
                        disabled={completingId === c.id}
                        title="Unificar Chamado"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <UnificarChamadoModal
        isOpen={!!unificarChamado}
        onClose={() => setUnificarChamado(null)}
        sourceChamado={unificarChamado}
        onSuccess={(destinoId) => {
          setUnificarChamado(null)
          fetchChamados()
          navigate(`/dashboard/chamados/${destinoId}`)
        }}
      />

      <AlertDialog
        open={!!confirmReabrirId}
        onOpenChange={(open) => !open && setConfirmReabrirId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja reabrir este chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              O chamado voltará para a fila de atendimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmReabrirId && handleReabrir(confirmReabrirId)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmFinalizarId}
        onOpenChange={(open) => !open && setConfirmFinalizarId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Atendimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar este atendimento? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmFinalizarId && handleFinalizar(confirmFinalizarId)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Sim, Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
