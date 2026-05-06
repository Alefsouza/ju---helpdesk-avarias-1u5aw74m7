import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Search, Inbox, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default function MeusAtendimentos() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [completingId, setCompletingId] = useState<string | null>(null)

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
        .eq('status', 'em_atendimento')
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

        const chamadosComNome = data.map((c) => ({
          ...c,
          nome_usuario: perfilMap?.[c.usuario_id] || 'Usuário Desconhecido',
          nome_responsavel: c.responsavel_id
            ? perfilMap?.[c.responsavel_id] || 'Sem responsável'
            : 'Sem responsável',
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
  }, [user])

  const handleFinalizar = async (chamadoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!window.confirm('Tem certeza que deseja finalizar este chamado?')) return

    setCompletingId(chamadoId)
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

  const PriorityBadge = ({ priority }: { priority: string }) => {
    const colors: Record<string, string> = {
      alta: 'bg-red-100 text-red-800 border-red-200',
      media: 'bg-orange-100 text-orange-800 border-orange-200',
      baixa: 'bg-slate-100 text-slate-800 border-slate-200',
    }
    return (
      <Badge variant="outline" className={colors[priority] || ''}>
        {priority.toUpperCase()}
      </Badge>
    )
  }

  const filteredChamados = chamados
    .filter((c) => {
      const term = debouncedSearch.toLowerCase()
      return (
        c.titulo.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term) ||
        c.nome_responsavel?.toLowerCase().includes(term) ||
        c.nome_usuario?.toLowerCase().includes(term)
      )
    })
    .sort((a, b) => {
      const respCompare = a.nome_responsavel.localeCompare(b.nome_responsavel)
      if (respCompare !== 0) return respCompare
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
            placeholder="Buscar por ID ou título..."
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
          <h3 className="text-lg font-medium text-slate-900">Nenhum atendimento em curso</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Não há chamados em atendimento no momento. Volte para a Fila de Atendimento para pegar
            novos chamados.
          </p>
          <Button onClick={() => navigate('/dashboard/chamados-abertos')}>
            Ir para Fila de Atendimento
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChamados.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-mono text-xs text-slate-500">{c.id}</TableCell>
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
                      <Badge
                        variant="outline"
                        className="bg-yellow-100 text-yellow-800 border-yellow-200"
                      >
                        EM ATENDIMENTO
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(c.atualizado_em)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigateToDetails(c.id)}>
                          Continuar
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        {c.responsavel_id === user?.id && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={(e) => handleFinalizar(c.id, e)}
                            disabled={completingId === c.id}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {completingId === c.id ? 'Finalizando...' : 'Finalizar'}
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
                      <div className="text-xs text-slate-500 font-mono mb-1">ID: {c.id}</div>
                      <h3 className="font-semibold text-slate-900 line-clamp-1">{c.titulo}</h3>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <PriorityBadge priority={c.prioridade} />
                    <Badge
                      variant="outline"
                      className="bg-yellow-100 text-yellow-800 border-yellow-200"
                    >
                      EM ATENDIMENTO
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
                    >
                      Continuar
                    </Button>
                    {c.responsavel_id === user?.id && (
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={(e) => handleFinalizar(c.id, e)}
                        disabled={completingId === c.id}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {completingId === c.id ? '...' : 'Finalizar'}
                      </Button>
                    )}
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
