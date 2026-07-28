import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useJuridicoTeam } from '@/hooks/use-juridico-team'
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
import { Search, Inbox, AlertCircle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-red-100 text-red-800 border-red-200',
  media: 'bg-orange-100 text-orange-800 border-orange-200',
  baixa: 'bg-slate-100 text-slate-800 border-slate-200',
  urgente: 'bg-red-600 text-white border-red-700',
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority)
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">
        NÃO DEFINIDA
      </Badge>
    )
  return (
    <Badge variant="outline" className={PRIORITY_COLORS[priority] || ''}>
      {priority.toUpperCase()}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={
        status === 'finalizado'
          ? 'bg-slate-100 text-slate-800 border-slate-200'
          : status === 'aberto'
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
      }
    >
      {status === 'finalizado' ? 'FINALIZADO' : status === 'aberto' ? 'ABERTO' : 'EM ATENDIMENTO'}
    </Badge>
  )
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Juridico() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { juridicoUserIds } = useJuridicoTeam()
  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('todas')
  const [filterDate, setFilterDate] = useState('')

  const isSinistro = profile?.tipo_usuario === 'sinistro'

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const fetchChamados = async () => {
    setLoading(true)
    setError(false)
    try {
      let query = supabase
        .from('chamados')
        .select('*, formularios_espelho_danos(registro_motorista, nome_motorista)')
        .order('atualizado_em', { ascending: false })

      if (isSinistro && juridicoUserIds.length > 0) {
        const idsCsv = juridicoUserIds.join(',')
        query = query.or(`status_juridico.not.is.null,responsavel_id.in.(${idsCsv})`)
      } else {
        query = query.not('status_juridico', 'is', null)
      }

      const { data, error: err } = await query

      if (err) throw err
      if (!data || data.length === 0) {
        setChamados([])
        return
      }

      const userIds = [
        ...new Set(data.flatMap((c) => [c.usuario_id, c.responsavel_id]).filter(Boolean)),
      ]
      const { data: perfis } = await supabase
        .from('perfil_usuario')
        .select('id, nome_completo')
        .in('id', userIds)

      const perfilMap = (perfis || []).reduce(
        (acc, p) => {
          acc[p.id] = p.nome_completo
          return acc
        },
        {} as Record<string, string>,
      )

      setChamados(
        data.map((c) => {
          const f = Array.isArray(c.formularios_espelho_danos)
            ? c.formularios_espelho_danos[0]
            : null
          return {
            ...c,
            nome_usuario: perfilMap[c.usuario_id] || 'Usuário Desconhecido',
            nome_responsavel: c.responsavel_id
              ? perfilMap[c.responsavel_id] || 'Sem responsável'
              : 'Sem responsável',
            motorista_nome: f?.nome_motorista || c.nome_motorista || '—',
            motorista_registro: f?.registro_motorista || c.registro_motorista || '—',
          }
        }),
      )
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const fetchRef = useRef(fetchChamados)
  useEffect(() => {
    fetchRef.current = fetchChamados
  }, [fetchChamados])

  useEffect(() => {
    fetchChamados()
    const ch = supabase
      .channel('juridico_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => {
        fetchRef.current()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [isSinistro, juridicoUserIds])

  const filtered = chamados
    .filter((c) => {
      const t = debouncedSearch.toLowerCase()
      const ms =
        c.titulo.toLowerCase().includes(t) ||
        c.id.toLowerCase().includes(t) ||
        c.pia?.toLowerCase().includes(t) ||
        c.motorista_nome?.toLowerCase().includes(t) ||
        c.motorista_registro?.toLowerCase().includes(t) ||
        c.nome_usuario?.toLowerCase().includes(t) ||
        c.nome_responsavel?.toLowerCase().includes(t)
      const mp =
        filterPriority === 'todas' ||
        c.prioridade === filterPriority ||
        (filterPriority === 'nao_definida' && !c.prioridade)
      const md = !filterDate || c.criado_em.startsWith(filterDate)
      return ms && mp && md
    })
    .sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime())

  const goToDetails = (id: string) => navigate(`/dashboard/chamados/${id}`)

  const renderSinistroDesktopTable = () => (
    <div className="hidden md:block rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>R.A.</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Colaborador</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Última Atualização</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer hover:bg-slate-50/80 transition-colors"
              onClick={() => goToDetails(c.id)}
            >
              <TableCell>
                <div className="font-semibold text-slate-700">{c.pia || '—'}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium text-slate-900 line-clamp-1">{c.titulo}</div>
              </TableCell>
              <TableCell className="text-sm">
                <span className="font-medium text-slate-700">{c.nome_usuario}</span>
              </TableCell>
              <TableCell>
                <PriorityBadge priority={c.prioridade} />
              </TableCell>
              <TableCell className="text-sm">
                <span className="font-medium text-slate-700">{c.nome_responsavel}</span>
              </TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                {formatDate(c.atualizado_em)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    goToDetails(c.id)
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const renderOriginalDesktopTable = () => (
    <div className="hidden md:block rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Título</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>R.A.</TableHead>
            <TableHead>Motorista</TableHead>
            <TableHead>Registro</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status Jurídico</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer hover:bg-slate-50/80 transition-colors"
              onClick={() => goToDetails(c.id)}
            >
              <TableCell>
                <div className="font-medium text-slate-900 line-clamp-1">{c.titulo}</div>
              </TableCell>
              <TableCell className="text-sm">
                <span className="font-medium text-slate-700">{c.nome_usuario}</span>
              </TableCell>
              <TableCell className="text-sm font-medium text-slate-600">{c.pia || '—'}</TableCell>
              <TableCell className="text-sm text-slate-600">{c.motorista_nome}</TableCell>
              <TableCell className="text-sm text-slate-600">{c.motorista_registro}</TableCell>
              <TableCell>
                <PriorityBadge priority={c.prioridade} />
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="bg-violet-100 text-violet-800 border-violet-200 whitespace-nowrap"
                >
                  {c.status_juridico}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                {formatDate(c.atualizado_em)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    goToDetails(c.id)
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const renderSinistroMobileCards = () => (
    <div className="md:hidden space-y-4">
      {filtered.map((c) => (
        <Card
          key={c.id}
          className="cursor-pointer hover:border-slate-300 transition-colors"
          onClick={() => goToDetails(c.id)}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  R.A.: {c.pia || '—'}
                </div>
                <h3 className="font-semibold text-slate-900 line-clamp-1">{c.titulo}</h3>
              </div>
              <PriorityBadge priority={c.prioridade} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <StatusBadge status={c.status} />
            </div>
            <div className="flex flex-col gap-1 text-sm text-slate-500 bg-slate-50 p-2 rounded-md">
              <div className="flex justify-between">
                <span className="font-medium text-slate-700 truncate">{c.nome_usuario}</span>
                <span className="whitespace-nowrap">{formatDate(c.atualizado_em)}</span>
              </div>
              <div className="font-medium text-slate-700">Colaborador: {c.nome_responsavel}</div>
            </div>
            <Button
              className="w-full"
              onClick={(e) => {
                e.stopPropagation()
                goToDetails(c.id)
              }}
            >
              Ver detalhes <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderOriginalMobileCards = () => (
    <div className="md:hidden space-y-4">
      {filtered.map((c) => (
        <Card
          key={c.id}
          className="cursor-pointer hover:border-slate-300 transition-colors"
          onClick={() => goToDetails(c.id)}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-semibold text-slate-900 line-clamp-1">{c.titulo}</h3>
              <PriorityBadge priority={c.prioridade} />
            </div>
            <div className="flex flex-col gap-1 text-sm text-slate-500 bg-slate-50 p-2 rounded-md">
              <div className="flex justify-between">
                <span className="font-medium text-slate-700 truncate">{c.nome_usuario}</span>
                <span className="whitespace-nowrap">{formatDate(c.atualizado_em)}</span>
              </div>
              <div>R.A.: {c.pia || '—'}</div>
              <div>
                Motorista: {c.motorista_nome} ({c.motorista_registro})
              </div>
              <div>
                <Badge
                  variant="outline"
                  className="bg-violet-100 text-violet-800 border-violet-200"
                >
                  {c.status_juridico}
                </Badge>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={(e) => {
                e.stopPropagation()
                goToDetails(c.id)
              }}
            >
              Ver detalhes <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2 sm:p-4 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Jurídico</h1>
        <p className="text-slate-500">Chamados transferidos para o departamento jurídico.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar por título, R.A., motorista..."
            className="pl-9 bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            type="date"
            className="bg-white shadow-sm w-full sm:w-[150px]"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full sm:w-[150px] bg-white shadow-sm">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="nao_definida">Não Definida</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Erro ao carregar chamados</h3>
          <Button onClick={fetchChamados} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
          <Inbox className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Nenhum chamado no jurídico</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Não há chamados transferidos para o jurídico ou nenhum corresponde aos filtros.
          </p>
          {(searchTerm || filterDate || filterPriority !== 'todas') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setFilterDate('')
                setFilterPriority('todas')
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          {isSinistro ? renderSinistroDesktopTable() : renderOriginalDesktopTable()}
          {isSinistro ? renderSinistroMobileCards() : renderOriginalMobileCards()}
        </>
      )}
    </div>
  )
}
