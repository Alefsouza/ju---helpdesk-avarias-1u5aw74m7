import { useEffect, useRef, useState, useCallback } from 'react'
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
  DollarSign,
} from 'lucide-react'
import { UnificarChamadoModal } from '@/components/UnificarChamadoModal'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { isDuplicateTicket, cn } from '@/lib/utils'
import { useJuridicoTeam } from '@/hooks/use-juridico-team'
import { isMariaJuridico, isLuizJuridico } from '@/lib/juridico-access'
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
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { juridicoUserIds } = useJuridicoTeam()
  const [searchParams, setSearchParams] = useSearchParams()

  const [chamados, setChamados] = useState<any[]>([])
  const [unificarChamado, setUnificarChamado] = useState<{
    id: string
    titulo: string
    pia?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [confirmFinalizarId, setConfirmFinalizarId] = useState<string | null>(null)
  const [confirmReabrirId, setConfirmReabrirId] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null,
  )
  const [situacaoFilter, setSituacaoFilter] = useState<string>(
    () => searchParams.get('situacao') || 'Todos',
  )
  const [situacaoOptions, setSituacaoOptions] = useState<string[]>([])
  const [orcamentoFilter, setOrcamentoFilter] = useState<string>('Todos')
  const [chamadosComOrcamento, setChamadosComOrcamento] = useState<Set<string>>(new Set())
  const [chamadosDevolvidos, setChamadosDevolvidos] = useState<Set<string>>(new Set())
  const [quickFilterOrcamento, setQuickFilterOrcamento] = useState(false)
  const [quickFilter15Dias, setQuickFilter15Dias] = useState(false)
  const [quickFilter30Dias, setQuickFilter30Dias] = useState(false)

  const isSinistro = profile?.tipo_usuario === 'sinistro'
  const isJuridicoTeamMember = isMariaJuridico(user?.email) || isLuizJuridico(user?.email)

  const RAQUEL_SINISTRO_EMAIL = 'raquel.santos@viasudeste.com'
  const ALEX_FONTES_EMAIL = 'alex.fontes@viasudeste.com'
  const [alexUserId, setAlexUserId] = useState<string | null>(null)
  const isRaquelSinistro = user?.email === RAQUEL_SINISTRO_EMAIL
  const userGaragem = profile?.garagem?.trim() || null
  const shouldFilterByGaragem = isSinistro && !isRaquelSinistro

  // Refs para manter dados atualizados sem causar re-subscrição no realtime
  const loadedChamadoIdsRef = useRef<Set<string>>(new Set())
  const loadedChamadosRef = useRef<any[]>([])
  const isInitialLoadRef = useRef<boolean>(true)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isSupport =
    profile?.tipo_usuario === 'responsavel' ||
    profile?.tipo_usuario === 'sinistro' ||
    profile?.tipo_usuario === 'admin' ||
    profile?.tipo_usuario === 'juridico' ||
    profile?.tipo_usuario === 'dp' ||
    user?.email === 'alex.fontes@viasudeste.com'

  const defaultWidths: Record<string, number> = {
    pia: 120,
    titulo: 300,
    solicitante: 180,
    prioridade: 120,
    colaborador: 180,
    status: 160,
    atualizacao: 160,
    acoes: 180,
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
    const fetchAlexUserId = async () => {
      try {
        const { data } = await supabase
          .from('perfil_usuario')
          .select('id')
          .eq('email', ALEX_FONTES_EMAIL)
          .maybeSingle()
        if (data?.id) {
          setAlexUserId(data.id)
        }
      } catch (err) {
        console.error('Erro ao buscar ID do Alex Fontes:', err)
      }
    }
    fetchAlexUserId()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchChamados = useCallback(
    async (isBackground = false) => {
      if (!user || !profile) return

      // Não pisca o skeleton em atualizações subsequentes (background / realtime)
      if (!isBackground && isInitialLoadRef.current) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setError(false)

      try {
        let query = supabase
          .from('chamados')
          .select('*, formularios_espelho_danos(registro_motorista, nome_motorista)')
          .eq('status', 'em_atendimento')
          .order('criado_em', { ascending: false })

        if (shouldFilterByGaragem) {
          if (!userGaragem) {
            setChamados([])
            loadedChamadosRef.current = []
            loadedChamadoIdsRef.current = new Set()
            setLoading(false)
            setIsRefreshing(false)
            isInitialLoadRef.current = false
            return
          }
          query = query.eq('garagem', userGaragem)
        }

        if (
          profile.tipo_usuario === 'juridico' ||
          profile.tipo_usuario === 'dp' ||
          user?.email === 'alex.fontes@viasudeste.com'
        ) {
          if (isJuridicoTeamMember && juridicoUserIds.length > 0) {
            query = query.in('responsavel_id', juridicoUserIds)
          } else {
            query = query.eq('responsavel_id', user.id)
          }
        } else {
          query = query
            .is('status_juridico', null)
            .or('status_sinistro.is.null,status_sinistro.eq.Terceiros')
        }

        const { data, error: err } = await query

        if (err) throw err

        let fetchedData = data || []
        if (profile.tipo_usuario === 'juridico' && user?.email !== 'alex.fontes@viasudeste.com') {
          fetchedData = fetchedData.filter(
            (c) =>
              c.status_juridico !== 'Cobrança de Terceiros' &&
              c.status_juridico !== 'Demanda Judicial' &&
              c.status_juridico !== 'Deferidos',
          )
        }

        // Permite chamados com status_sinistro = 'Terceiros' se pertencem à garagem do usuário logado OU se o responsavel_id é o próprio usuário (ou do time jurídico, para membros do jurídico)
        fetchedData = fetchedData.filter((c: any) => {
          if (c.status_sinistro === 'Terceiros') {
            const isMine = isJuridicoTeamMember
              ? juridicoUserIds.length > 0
                ? juridicoUserIds.includes(c.responsavel_id)
                : c.responsavel_id === user.id
              : c.responsavel_id === user.id
            const isMyGaragem =
              !!userGaragem && (c.garagem || '').trim().toLowerCase() === userGaragem.toLowerCase()
            return isMine || isMyGaragem
          }
          return true
        })

        if (isSinistro && juridicoUserIds.length > 0) {
          // Para sinistro: não exibir chamados do time jurídico, mas NUNCA filtrar chamados do Alex Fontes
          fetchedData = fetchedData.filter(
            (c) =>
              !juridicoUserIds.includes(c.responsavel_id) ||
              (alexUserId && c.responsavel_id === alexUserId),
          )
        }

        if (fetchedData.length > 0) {
          const userIds = [
            ...new Set(
              fetchedData.flatMap((c) => [c.usuario_id, c.responsavel_id]).filter(Boolean),
            ),
          ]
          const chamadoIds = fetchedData.map((c) => c.id)

          // Extração otimizada para detecção de duplicados:
          // Apenas carros e datas presentes nos chamados da tela
          const carrosSet = new Set<string>()
          const datasSet = new Set<string>()
          fetchedData.forEach((c) => {
            if (c.carro) carrosSet.add(c.carro)
            if (c.data_ocorrencia) datasSet.add(c.data_ocorrencia)
          })

          const carrosList = Array.from(carrosSet)
          const datasList = Array.from(datasSet)

          const batchSize = 200
          const normalizeName = (name: string | null | undefined): string =>
            (name || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')

          // Fatiar IDs para consultas em lotes
          const batches: string[][] = []
          for (let i = 0; i < chamadoIds.length; i += batchSize) {
            batches.push(chamadoIds.slice(i, i + batchSize))
          }

          // Execução PARALELA de todas as consultas auxiliares
          const [perfisResult, activeChamadosResult, anexosResults, docsResults] =
            await Promise.all([
              // 1. Perfis de usuários
              userIds.length > 0
                ? supabase.from('perfil_usuario').select('id, nome_completo').in('id', userIds)
                : Promise.resolve({ data: [] }),

              // 2. Chamados ativos para duplicados (somente colunas necessárias e filtrados por data_ocorrencia quando disponível)
              datasList.length > 0
                ? supabase
                    .from('chamados')
                    .select('id, carro, titulo, data_ocorrencia, status')
                    .in('status', ['aberto', 'em_atendimento'])
                    .in('data_ocorrencia', datasList)
                : supabase
                    .from('chamados')
                    .select('id, carro, titulo, data_ocorrencia, status')
                    .in('status', ['aberto', 'em_atendimento']),

              // 3. Anexos internos (em paralelo por lote)
              Promise.all(
                batches.map((batch) =>
                  supabase
                    .from('anexos_chamado_interno')
                    .select('chamado_id, nome_arquivo')
                    .in('chamado_id', batch),
                ),
              ),

              // 4. Documentos (em paralelo por lote)
              Promise.all(
                batches.map((batch) =>
                  supabase
                    .from('documentos')
                    .select('chamado_id, nome_arquivo, tipo_documento, orcamento_url, is_recusado')
                    .in('chamado_id', batch),
                ),
              ),
            ])

          const perfilMap = (perfisResult.data || []).reduce(
            (acc: Record<string, string>, p: any) => {
              acc[p.id] = p.nome_completo
              return acc
            },
            {},
          )

          const activeChamados = (activeChamadosResult.data || []) as any[]

          // Processar anexos de todos os lotes
          const orcamentoIds = new Set<string>()
          anexosResults.forEach((res) => {
            if (res.error) {
              console.error(
                '[MeusAtendimentos] Erro ao buscar anexos_chamado_interno para orçamento:',
                res.error,
              )
            }
            ;(res.data || []).forEach((a: any) => {
              if (normalizeName(a.nome_arquivo).includes('orcamento') && a.chamado_id) {
                orcamentoIds.add(a.chamado_id)
              }
            })
          })

          // Processar documentos de todos os lotes
          const devolvidoIds = new Set<string>()
          docsResults.forEach((res) => {
            if (res.error) {
              console.error(
                '[MeusAtendimentos] Erro ao buscar documentos para orçamento:',
                res.error,
              )
            }
            ;(res.data || []).forEach((d: any) => {
              if (d.is_recusado && d.chamado_id) {
                devolvidoIds.add(d.chamado_id)
              }
              const nome = normalizeName(d.nome_arquivo)
              const tipo = normalizeName(d.tipo_documento)
              const orcamentoUrl = normalizeName(d.orcamento_url)
              if (
                nome.includes('orcamento') ||
                tipo.includes('orcamento') ||
                orcamentoUrl.includes('orcamento')
              ) {
                if (d.chamado_id) {
                  orcamentoIds.add(d.chamado_id)
                }
              }
            })
          })

          const chamadosComNome = fetchedData.map((c) => ({
            ...c,
            nome_usuario: perfilMap?.[c.usuario_id] || 'Usuário Desconhecido',
            nome_responsavel: c.responsavel_id
              ? perfilMap?.[c.responsavel_id] || 'Sem responsável'
              : 'Sem responsável',
            is_duplicate: isDuplicateTicket(c, activeChamados),
          }))

          setChamados(chamadosComNome)
          loadedChamadosRef.current = chamadosComNome
          loadedChamadoIdsRef.current = new Set(chamadoIds)
          setChamadosComOrcamento(orcamentoIds)
          setChamadosDevolvidos(devolvidoIds)
        } else {
          setChamados([])
          loadedChamadosRef.current = []
          loadedChamadoIdsRef.current = new Set()
          setChamadosComOrcamento(new Set())
          setChamadosDevolvidos(new Set())
        }
      } catch (e) {
        console.error(e)
        setError(true)
      } finally {
        setLoading(false)
        setIsRefreshing(false)
        isInitialLoadRef.current = false
      }
    },
    [
      user,
      profile,
      shouldFilterByGaragem,
      userGaragem,
      isJuridicoTeamMember,
      juridicoUserIds,
      isSinistro,
      alexUserId,
    ],
  )

  const fetchChamadosRef = useRef(fetchChamados)
  useEffect(() => {
    fetchChamadosRef.current = fetchChamados
  }, [fetchChamados])

  // Debounced trigger para realtime: agrupa rajadas e recarrega em background (sem piscar skeleton)
  const triggerDebouncedRefetch = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchChamadosRef.current(true)
    }, 1200)
  }, [])

  useEffect(() => {
    if (!profile) return

    // Carga inicial
    fetchChamadosRef.current(false)

    // Avalia se o evento de alteração em 'chamados' é relevante para a tela
    const isChamadoEventRelevant = (payload: any): boolean => {
      const { eventType, new: newRecord, old: oldRecord } = payload

      // Se o chamado já está exibido na tela, qualquer alteração ou delete é relevante
      if (oldRecord?.id && loadedChamadoIdsRef.current.has(oldRecord.id)) return true
      if (newRecord?.id && loadedChamadoIdsRef.current.has(newRecord.id)) return true

      // Se é INSERT ou UPDATE com status 'em_atendimento', pode ser um novo atendimento
      const targetRecord = newRecord || oldRecord
      if (!targetRecord) return false

      if (targetRecord.status !== 'em_atendimento') return false

      // Se usuário tem filtro de garagem, checar se bate com a garagem
      if (shouldFilterByGaragem && userGaragem) {
        const recGaragem = (targetRecord.garagem || '').trim().toLowerCase()
        if (recGaragem !== userGaragem.toLowerCase()) return false
      }

      // Se usuário for jurídico/dp/alex
      if (
        profile.tipo_usuario === 'juridico' ||
        profile.tipo_usuario === 'dp' ||
        user?.email === 'alex.fontes@viasudeste.com'
      ) {
        if (isJuridicoTeamMember && juridicoUserIds.length > 0) {
          if (!juridicoUserIds.includes(targetRecord.responsavel_id)) return false
        } else {
          if (targetRecord.responsavel_id !== user?.id) return false
        }
      }

      return true
    }

    // Avalia se alteração em 'documentos' afeta algum chamado da lista
    const isDocumentoEventRelevant = (payload: any): boolean => {
      const { new: newRecord, old: oldRecord } = payload
      const chamadoId = newRecord?.chamado_id || oldRecord?.chamado_id
      if (!chamadoId) return false
      return loadedChamadoIdsRef.current.has(chamadoId)
    }

    const channel = supabase
      .channel('meus_atendimentos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, (payload) => {
        if (isChamadoEventRelevant(payload)) {
          triggerDebouncedRefetch()
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos' }, (payload) => {
        if (isDocumentoEventRelevant(payload)) {
          triggerDebouncedRefetch()
        }
      })
      .subscribe()

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [
    user,
    profile,
    shouldFilterByGaragem,
    userGaragem,
    isJuridicoTeamMember,
    juridicoUserIds,
    triggerDebouncedRefetch,
  ])

  useEffect(() => {
    const fetchSituacaoOptions = async () => {
      if (!user || !profile) return
      try {
        let query = supabase
          .from('chamados')
          .select('situacao_processo, responsavel_id')
          .eq('status', 'em_atendimento')
          .not('situacao_processo', 'is', null)

        if (shouldFilterByGaragem) {
          if (!userGaragem) {
            setSituacaoOptions([])
            return
          }
          query = query.eq('garagem', userGaragem)
        }

        if (
          profile.tipo_usuario === 'juridico' ||
          profile.tipo_usuario === 'dp' ||
          user?.email === 'alex.fontes@viasudeste.com'
        ) {
          if (isJuridicoTeamMember && juridicoUserIds.length > 0) {
            query = query.in('responsavel_id', juridicoUserIds)
          } else {
            query = query.eq('responsavel_id', user.id)
          }
        } else {
          query = query
            .is('status_juridico', null)
            .or('status_sinistro.is.null,status_sinistro.eq.Terceiros')
        }

        const { data, error: err } = await query
        if (err) throw err

        let optionsData = data || []
        if (isSinistro && juridicoUserIds.length > 0) {
          optionsData = optionsData.filter(
            (c: any) =>
              !juridicoUserIds.includes(c.responsavel_id) ||
              (alexUserId && c.responsavel_id === alexUserId),
          )
        }

        const distinct = [
          ...new Set(optionsData.map((c: any) => c.situacao_processo).filter(Boolean)),
        ]
        setSituacaoOptions(distinct)
      } catch (e) {
        console.error(e)
      }
    }

    fetchSituacaoOptions()
  }, [user, profile, juridicoUserIds, alexUserId])

  const handleReabrir = async (chamadoId: string) => {
    setCompletingId(chamadoId)
    setConfirmReabrirId(null)
    try {
      const { data, error: updateError } = await supabase
        .from('chamados')
        .update({
          status: 'em_atendimento',
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
          c.id === chamadoId ? { ...c, status: 'em_atendimento', responsavel_id: user?.id } : c,
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

  const getAttendanceDays = (criadoEm: string): number => {
    const created = new Date(criadoEm)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }

  const getAttendanceIndicator = (criadoEm: string): { color: string; message: string } | null => {
    const days = getAttendanceDays(criadoEm)
    if (days > 30) {
      return { color: 'bg-red-500', message: 'Chamado em atendimento há mais de 30 dias' }
    }
    if (days >= 15) {
      return { color: 'bg-orange-500', message: 'Chamado em atendimento há mais de 15 dias' }
    }
    return null
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
      // Para o perfil sinistro, orçamentos devolvidos para a Secretaria Técnica reenviar
      // saem da lista de Atendimentos e vão para a aba "Orçamentos Devolvidos".
      // Quando o orçamento é reenviado pela Secretaria Técnica, ele volta automaticamente.
      if (isSinistro && chamadosDevolvidos.has(c.id)) return false

      if (situacaoFilter !== 'Todos' && c.situacao_processo !== situacaoFilter) return false
      if (orcamentoFilter === 'Com orçamento' && !chamadosComOrcamento.has(c.id)) return false
      if (orcamentoFilter === 'Sem orçamento' && chamadosComOrcamento.has(c.id)) return false
      if (quickFilterOrcamento && !chamadosComOrcamento.has(c.id)) return false
      if (quickFilter15Dias && getAttendanceDays(c.criado_em) <= 15) return false
      if (quickFilter30Dias && getAttendanceDays(c.criado_em) <= 30) return false
      if (!debouncedSearch) return true
      const term = debouncedSearch.toLowerCase()
      return (
        c.titulo?.toLowerCase().includes(term) ||
        c.pia?.toLowerCase().includes(term) ||
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Atendimentos</h1>
            {isRefreshing && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
                Atualizando...
              </span>
            )}
          </div>
          <p className="text-slate-500">
            Acompanhe todos os chamados que estão atualmente em atendimento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchChamados(true)}
            disabled={loading || isRefreshing}
            className="text-slate-600"
            title="Recarregar lista"
          >
            <RotateCcw className={cn('h-4 w-4 mr-1.5', isRefreshing && 'animate-spin')} />
            Atualizar
          </Button>
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
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Orçamento</span>
          <Select value={orcamentoFilter} onValueChange={setOrcamentoFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white shadow-sm">
              <SelectValue placeholder="Orçamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Com orçamento">Com orçamento</SelectItem>
              <SelectItem value="Sem orçamento">Sem orçamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1.5 -mt-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setQuickFilterOrcamento((v) => !v)}
                className={cn(
                  'flex items-center justify-center h-7 w-7 rounded-md border transition-all duration-200',
                  quickFilterOrcamento
                    ? 'bg-green-100 border-green-400 text-green-600 shadow-sm scale-105'
                    : 'bg-slate-50 border-slate-200 text-slate-300 hover:text-slate-400 opacity-60 hover:opacity-100',
                )}
                title="Filtrar chamados com orçamento"
              >
                <DollarSign className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Chamados com orçamento</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setQuickFilter15Dias((v) => !v)}
                className={cn(
                  'flex items-center justify-center h-7 w-7 rounded-md border transition-all duration-200',
                  quickFilter15Dias
                    ? 'bg-orange-100 border-orange-400 shadow-sm scale-105'
                    : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100',
                )}
                title="Filtrar chamados em atendimento há mais de 15 dias"
              >
                <span
                  className={cn(
                    'inline-block h-3 w-3 rounded-full transition-colors',
                    quickFilter15Dias ? 'bg-orange-500' : 'bg-orange-300/50',
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Em atendimento há mais de 15 dias</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setQuickFilter30Dias((v) => !v)}
                className={cn(
                  'flex items-center justify-center h-7 w-7 rounded-md border transition-all duration-200',
                  quickFilter30Dias
                    ? 'bg-red-100 border-red-400 shadow-sm scale-105'
                    : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100',
                )}
                title="Filtrar chamados em atendimento há mais de 30 dias"
              >
                <span
                  className={cn(
                    'inline-block h-3 w-3 rounded-full transition-colors',
                    quickFilter30Dias ? 'bg-red-500' : 'bg-red-300/50',
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Em atendimento há mais de 30 dias</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
          <Button onClick={() => fetchChamados(false)}>Tentar novamente</Button>
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
                      <span className="break-words whitespace-normal">Título</span>
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
                    <div className="flex items-center gap-1 pr-2">
                      <span className="break-words whitespace-normal">Solicitante</span>
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
                    <div className="flex items-center gap-1 pr-2">
                      <span className="break-words whitespace-normal">Prioridade</span>
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
                    <div className="flex items-center gap-1 pr-2">
                      <span className="break-words whitespace-normal">Colaborador</span>
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
                    onClick={() => handleSort('atualizado_em')}
                    style={{ width: columnWidths.atualizacao }}
                  >
                    <div className="flex items-center gap-1 pr-2">
                      <span className="break-words whitespace-normal">Última Atualização</span>
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
                      <div className="flex items-center gap-1">
                        <div
                          className="font-semibold text-slate-700 break-words whitespace-normal"
                          title={c.pia || ''}
                        >
                          {c.pia || '—'}
                        </div>
                        {chamadosComOrcamento.has(c.id) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DollarSign className="h-4 w-4 text-green-600 shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Chamado com orçamento!</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="flex items-center gap-2">
                        <div
                          className="font-medium text-slate-900 break-words whitespace-normal"
                          title={c.titulo}
                        >
                          {c.titulo}
                        </div>
                        {(() => {
                          const indicator = getAttendanceIndicator(c.criado_em)
                          if (!indicator) return null
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={`inline-block h-3 w-3 rounded-full shrink-0 cursor-help ${indicator.color}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{indicator.message}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })()}
                        {c.is_duplicate && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Atenção: Já existe um chamado ativo (aberto ou em atendimento)
                                  para este veículo com a mesma data de criação ou ocorrência.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle text-sm">
                      <div
                        className="font-medium text-slate-700 break-words whitespace-normal"
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
                        className="font-medium text-slate-700 break-words whitespace-normal"
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
                    <TableCell className="align-middle text-sm text-slate-500 break-words whitespace-normal">
                      {formatDate(c.atualizado_em)}
                    </TableCell>
                    <TableCell className="align-middle text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1 flex-nowrap whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateToDetails(c.id)}
                          title="Abrir Atendimento"
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                        {c.responsavel_id === user?.id && c.status !== 'finalizado' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmFinalizarId(c.id)
                            }}
                            disabled={completingId === c.id}
                            title="Finalizar"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {c.status === 'finalizado' && isSupport && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmReabrirId(c.id)
                            }}
                            disabled={completingId === c.id}
                            title="Reabrir Chamado"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {c.status !== 'finalizado' && isSupport && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setUnificarChamado({ id: c.id, titulo: c.titulo, pia: c.pia })
                            }}
                            disabled={completingId === c.id}
                            title="Unificar Chamado"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
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
                      <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1 break-words whitespace-normal">
                        <span>R.A.: {c.pia || '—'}</span>
                        {chamadosComOrcamento.has(c.id) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DollarSign className="h-4 w-4 text-green-600 shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Chamado com orçamento!</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 break-words whitespace-normal">
                          {c.titulo}
                        </h3>
                        {(() => {
                          const indicator = getAttendanceIndicator(c.criado_em)
                          if (!indicator) return null
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={`inline-block h-3 w-3 rounded-full shrink-0 cursor-help ${indicator.color}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{indicator.message}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })()}
                        {c.is_duplicate && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Atenção: Já existe um chamado ativo (aberto ou em atendimento)
                                  para este veículo com a mesma data de criação ou ocorrência.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
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

                  <div className="flex flex-col gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-md break-words whitespace-normal">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="font-medium text-slate-700 break-words whitespace-normal">
                        Solicitante: {c.nome_usuario}
                      </span>
                      <span className="break-words whitespace-normal">
                        {formatDate(c.atualizado_em)}
                      </span>
                    </div>
                    <div className="font-medium text-slate-700 break-words whitespace-normal">
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
        targetChamado={unificarChamado}
        onSuccess={() => {
          const id = unificarChamado?.id
          setUnificarChamado(null)
          fetchChamados()
          if (id) {
            navigate(`/dashboard/chamados/${id}`)
          }
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
