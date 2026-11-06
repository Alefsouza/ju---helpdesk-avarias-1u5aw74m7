import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Ticket, AlertCircle, ExternalLink, RotateCcw } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ConsultaRow = {
  chamado_id: string
  titulo: string | null
  status_chamado: string | null
  status_interno: string | null
  status_aprovacao_alex: string | null
  status_aprovacao_claudinei: string | null
  status_aprovacao: string | null
  aprovacoes_diretoria: any[] | null
  situacao_processo: string | null
  status_juridico: string | null
  carro: string | null
  linha: string | null
  data_ocorrencia: string | null
  criado_em: string | null
  registro_motorista: string | null
  nome_motorista: string | null
  registro_cobrador: string | null
  nome_cobrador: string | null
  pia: string | null
  tipo_chamado: string | null
  parcelas_ativas: number
  valor_parcelas: number | null
  proxima_parcela: string | null
  cobranca_status: string
}

const fmtData = (d?: string | null) =>
  d ? new Intl.DateTimeFormat('pt-BR').format(new Date(d.length === 10 ? d + 'T12:00:00' : d)) : '—'

const fmtBRL = (v?: number | null) =>
  v && Number(v) > 0
    ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—'

function etapaChamado(c: ConsultaRow): { label: string; cls: string } {
  if (c.status_interno === 'aguardando_claudinei' || c.status_aprovacao_claudinei === 'pendente') {
    return { label: 'Pendente aprovação - Dr. Claudinei', cls: 'bg-amber-100 text-amber-800' }
  }
  if (c.status_interno === 'AGUARDANDO_ALEX' || c.status_aprovacao_alex === 'pendente') {
    return { label: 'Pendente aprovação - Alex', cls: 'bg-amber-100 text-amber-800' }
  }
  if (
    c.status_interno === 'Aprovação Diretoria' ||
    c.status_aprovacao === 'pendente' ||
    c.status_aprovacao === 'aprovacao_parcial'
  ) {
    return { label: 'Pendente aprovação - Diretoria', cls: 'bg-purple-100 text-purple-800' }
  }
  if (c.status_interno === 'Reprovado Diretoria') {
    return { label: 'Reprovado pela Diretoria', cls: 'bg-red-100 text-red-800' }
  }
  if (
    c.status_interno === 'aguardando_financeiro' ||
    c.status_interno === 'aguardando_contabil_e_financeiro'
  ) {
    return { label: 'Aguardando Financeiro/Contábil', cls: 'bg-sky-100 text-sky-800' }
  }
  if (c.status_chamado === 'finalizado') {
    return { label: 'Finalizado', cls: 'bg-green-100 text-green-800' }
  }
  if (c.status_chamado === 'unificado') {
    return { label: 'Unificado', cls: 'bg-slate-200 text-slate-700' }
  }
  if (c.status_chamado === 'em_atendimento' || c.status_chamado === 'em_andamento') {
    return { label: 'Em andamento', cls: 'bg-yellow-100 text-yellow-800' }
  }
  if (c.status_chamado === 'aberto') {
    return { label: 'Aberto', cls: 'bg-blue-100 text-blue-800' }
  }
  return { label: c.status_chamado || '—', cls: 'bg-slate-100 text-slate-700' }
}

export default function ConsultaColaborador() {
  const [busca, setBusca] = useState('')
  const [debounced, setDebounced] = useState('')
  const [rows, setRows] = useState<ConsultaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(busca.trim()), 400)
    return () => clearTimeout(t)
  }, [busca])

  const buscar = async (termo: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('rpc_consulta_colaborador', {
        p_busca: termo,
      })
      if (rpcError) throw rpcError
      setRows((data as any[]) || [])
      setSearched(true)
    } catch (err: any) {
      console.error(err)
      setError('Erro ao consultar. Tente novamente.')
      setRows([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (debounced.length < 2) {
      setRows([])
      setSearched(false)
      return
    }
    buscar(debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consulta de Avarias</h1>
          <p className="text-muted-foreground">
            Pesquise pelo nome ou registro do colaborador para ver a situação dos chamados.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setBusca('')
            setRows([])
            setSearched(false)
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpar
        </Button>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome ou registro do colaborador (ex.: 12345 ou João da Silva)..."
              className="pl-9 bg-background"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Digite pelo menos 2 caracteres. A busca é automática.
          </p>
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {!loading && !error && searched && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Ticket className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhum chamado encontrado para "{debounced}".</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chamado</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Onde está</TableHead>
                  <TableHead>Cobrança</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const etapa = etapaChamado(c)
                  return (
                    <TableRow key={c.chamado_id}>
                      <TableCell>
                        <div className="font-medium">{c.titulo || 'Sem título'}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.carro ? `Carro ${c.carro}` : ''}
                          {c.carro && c.linha ? ' • ' : ''}
                          {c.linha ? `Linha ${c.linha}` : ''}
                          {c.data_ocorrencia ? ` • Ocorrência ${fmtData(c.data_ocorrencia)}` : ''}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Aberto em {fmtData(c.criado_em)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.nome_motorista || c.registro_motorista ? (
                          <div>
                            <div className="text-sm">{c.nome_motorista || '—'}</div>
                            <div className="text-xs text-muted-foreground">
                              Motorista {c.registro_motorista || ''}
                            </div>
                          </div>
                        ) : null}
                        {c.nome_cobrador || c.registro_cobrador ? (
                          <div className="mt-1">
                            <div className="text-sm">{c.nome_cobrador || '—'}</div>
                            <div className="text-xs text-muted-foreground">
                              Cobrador {c.registro_cobrador || ''}
                            </div>
                          </div>
                        ) : null}
                        {!c.nome_motorista &&
                          !c.nome_cobrador &&
                          !c.registro_motorista &&
                          !c.registro_cobrador && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={`${etapa.cls} border-transparent`}>{etapa.label}</Badge>
                          {c.situacao_processo && (
                            <div>
                              <Badge variant="outline" className="text-xs text-slate-600">
                                {c.situacao_processo}
                              </Badge>
                            </div>
                          )}
                          {c.status_juridico && (
                            <div>
                              <Badge variant="outline" className="text-xs text-slate-600">
                                Jurídico: {c.status_juridico}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.cobranca_status === 'cobrado' ? (
                          <div className="space-y-1">
                            <Badge className="bg-green-100 text-green-800 border-transparent">
                              Cobrança em andamento
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {c.parcelas_ativas} parcela(s) • {fmtBRL(c.valor_parcelas)}
                              {c.proxima_parcela ? ` • próxima ${fmtData(c.proxima_parcela)}` : ''}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-slate-600">
                            A cobrar (DP)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/dashboard/chamados/${c.chamado_id}`}>
                            <ExternalLink className="mr-1 h-4 w-4" />
                            Detalhes
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
