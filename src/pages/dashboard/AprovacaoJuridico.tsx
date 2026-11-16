import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Gavel, CheckCircle, XCircle, RefreshCw, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ChamadoCobranca = {
  id: string
  pia: string | null
  carro: string | null
  titulo: string
  status: string
  atualizado_em: string
  registro_motorista_cobranca: string | null
  nome_motorista_cobranca: string | null
  status_aprovacao_juridico_1: string | null
  status_aprovacao_diretoria_2: string | null
  justificativa_juridico_1: string | null
  justificativa_diretoria_2: string | null
  aprovacoes_diretoria_cobranca: { usuario_id: string; aprovado_em: string }[] | null
}

const DIRETORIA_EMAILS = ['leandro.ferraz@viasudeste.com', 'sonia.mattoso@viasudeste.com']

export default function AprovacaoJuridico() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [chamados, setChamados] = useState<ChamadoCobranca[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<'pendente' | 'aprovados'>('pendente')

  const [reprovarChamadoId, setReprovarChamadoId] = useState<string | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [etapaReprovacao, setEtapaReprovacao] = useState<'1' | '2'>('1')

  const isClaudinei = user?.email === 'claudinei.mariano@viasudeste.com'
  const isBianca = user?.email === 'bianca.zanatta@viasudeste.com'
  // Diretoria = Leandro Ferraz e Dona Sonia (mesmo critério do Layout: departamento Diretoria)
  const isDiretoria =
    profile?.departamento === 'Diretoria' || DIRETORIA_EMAILS.includes(user?.email || '')
  const isTi = profile?.tipo_usuario === 'ti'
  const isAdmin = profile?.tipo_usuario === 'admin' && !isDiretoria

  // Claudinei/Bianca aprovam na 1ª etapa; diretoria só vê a 2ª etapa
  // (liberada somente quando a 1ª já foi aprovada); TI/admin veem tudo.
  const podeAprovarEtapa1 = isClaudinei || isBianca || isTi || isAdmin
  const podeAprovarEtapa2 = isDiretoria || isTi || isAdmin

  const fetchChamados = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chamados')
        .select(
          `id, pia, carro, titulo, status, atualizado_em,
           registro_motorista_cobranca, nome_motorista_cobranca,
           status_aprovacao_juridico_1, status_aprovacao_diretoria_2,
           justificativa_juridico_1, justificativa_diretoria_2,
           aprovacoes_diretoria_cobranca`,
        )
        .not('registro_motorista_cobranca', 'is', null)
        .order('atualizado_em', { ascending: false })

      if (error) throw error
      setChamados((data as ChamadoCobranca[]) || [])
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar chamados para aprovação')
      setChamados([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchChamados()
  }, [fetchChamados])

  // 1ª etapa não concluída => pendente de gestor; concluída (aprovado/reprovado) => segue para diretoria
  const etapa1Concluida = (c: ChamadoCobranca) =>
    c.status_aprovacao_juridico_1 === 'aprovado' || c.status_aprovacao_juridico_1 === 'reprovado'

  const etapa2Concluida = (c: ChamadoCobranca) =>
    c.status_aprovacao_diretoria_2 === 'aprovado' || c.status_aprovacao_diretoria_2 === 'reprovado'

  const isPendenteGestor = (c: ChamadoCobranca) =>
    c.status_aprovacao_juridico_1 === 'pendente' && !etapa1Concluida(c)

  const isPendenteDiretoria = (c: ChamadoCobranca) => etapa1Concluida(c) && !etapa2Concluida(c)

  const handleAprovar = async (c: ChamadoCobranca) => {
    if (!user) return
    const etapa: '1' | '2' = isPendenteGestor(c) ? '1' : '2'
    if (etapa === '1' && !podeAprovarEtapa1) {
      toast.error('Somente Claudinei ou Bianca podem aprovar esta etapa')
      return
    }
    if (etapa === '2' && !podeAprovarEtapa2) {
      toast.error('Somente a Diretoria (Leandro Ferraz e Dona Sonia) pode aprovar esta etapa')
      return
    }
    if (etapa === '1' && !isPendenteGestor(c)) return
    if (etapa === '2' && !isPendenteDiretoria(c)) return

    setActionLoading(c.id)
    try {
      if (etapa === '1') {
        const { error } = await supabase
          .from('chamados')
          .update({
            status_aprovacao_juridico_1: 'aprovado',
            aprovador_juridico_1: user.id,
            aprovador_juridico_1_em: new Date().toISOString(),
          })
          .eq('id', c.id)
        if (error) throw error

        await supabase.from('historico_chamado').insert({
          chamado_id: c.id,
          usuario_id: user.id,
          acao: 'aprovacao_cobranca_gestor',
        })
        toast.success('Aprovação registrada. Chamado encaminhado à Diretoria.')
      } else {
        const novasAprovacoes = [
          ...(c.aprovacoes_diretoria_cobranca || []).filter((a) => a.usuario_id !== user.id),
          { usuario_id: user.id, aprovado_em: new Date().toISOString() },
        ]
        const completou = novasAprovacoes.length >= 2
        const { error } = await supabase
          .from('chamados')
          .update({
            aprovacoes_diretoria_cobranca: novasAprovacoes,
            ...(completou
              ? { status_aprovacao_diretoria_2: 'aprovado' }
              : { status_aprovacao_diretoria_2: 'pendente' }),
          })
          .eq('id', c.id)
        if (error) throw error

        await supabase.from('historico_chamado').insert({
          chamado_id: c.id,
          usuario_id: user.id,
          acao: completou ? 'aprovacao_cobranca_diretoria_final' : 'aprovacao_cobranca_diretoria',
        })
        toast.success(
          completou
            ? 'Aprovação da diretoria concluída (2/2). Chamado liberado.'
            : 'Aprovação registrada (1/2 da diretoria).',
        )
      }
      await fetchChamados()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao registrar aprovação')
    } finally {
      setActionLoading(null)
    }
  }

  const abrirReprovacao = (c: ChamadoCobranca) => {
    const etapa: '1' | '2' = isPendenteGestor(c) ? '1' : '2'
    setEtapaReprovacao(etapa)
    setJustificativa('')
    setReprovarChamadoId(c.id)
  }

  const handleReprovar = async () => {
    if (!user || !reprovarChamadoId) return
    if (!justificativa.trim()) {
      toast.error('Informe a justificativa da reprovação')
      return
    }
    setActionLoading(reprovarChamadoId)
    try {
      if (etapaReprovacao === '1') {
        const { error } = await supabase
          .from('chamados')
          .update({
            status_aprovacao_juridico_1: 'reprovado',
            aprovador_juridico_1: user.id,
            aprovador_juridico_1_em: new Date().toISOString(),
            justificativa_juridico_1: justificativa.trim(),
          })
          .eq('id', reprovarChamadoId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('chamados')
          .update({
            status_aprovacao_diretoria_2: 'reprovado',
            justificativa_diretoria_2: justificativa.trim(),
          })
          .eq('id', reprovarChamadoId)
        if (error) throw error
      }

      await supabase.from('historico_chamado').insert({
        chamado_id: reprovarChamadoId,
        usuario_id: user.id,
        acao:
          etapaReprovacao === '1' ? 'reprovacao_cobranca_gestor' : 'reprovacao_cobranca_diretoria',
      })

      toast.success('Reprovação registrada com justificativa')
      setReprovarChamadoId(null)
      await fetchChamados()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao registrar reprovação')
    } finally {
      setActionLoading(null)
    }
  }

  const pendentes = chamados.filter(
    (c) =>
      (isPendenteGestor(c) && podeAprovarEtapa1) || (isPendenteDiretoria(c) && podeAprovarEtapa2),
  )
  const concluidos = chamados.filter((c) => etapa2Concluida(c) || etapa1Concluida(c) === true)

  const pendentesVisiveis = pendentes.filter((c) => {
    if (isTi || isAdmin) return true
    if (isDiretoria) return etapa1Concluida(c)
    return true // Claudinei/Bianca
  })

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const renderCard = (c: ChamadoCobranca) => {
    const pendenteGestor = isPendenteGestor(c)
    const pendenteDiretoria = isPendenteDiretoria(c)
    const podeAgir = pendenteGestor ? podeAprovarEtapa1 : podeAprovarEtapa2
    const jaAproveiDiretoria = (c.aprovacoes_diretoria_cobranca || []).some(
      (a) => a.usuario_id === user?.id,
    )
    const podeAprovarDiretoria = pendenteDiretoria && podeAprovarEtapa2 && !jaAproveiDiretoria

    return (
      <Card key={c.id} className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                {c.pia ? `Chamado ${c.pia}` : c.titulo}
                {c.carro && (
                  <Badge variant="outline" className="text-[10px]">
                    Carro {c.carro}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {format(new Date(c.atualizado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pendenteGestor && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                  1ª etapa — aguardando Claudinei/Bianca
                </Badge>
              )}
              {pendenteDiretoria && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                  2ª etapa — aguardando Diretoria (2/2)
                </Badge>
              )}
              {c.status_aprovacao_diretoria_2 === 'aprovado' && (
                <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                  Aprovado (2/2)
                </Badge>
              )}
              {c.status_aprovacao_juridico_1 === 'reprovado' && (
                <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                  Reprovado na 1ª etapa
                </Badge>
              )}
              {c.status_aprovacao_diretoria_2 === 'reprovado' && (
                <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                  Reprovado pela Diretoria
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-800 uppercase tracking-wider">
              <Gavel className="h-4 w-4" />
              Motorista a cobrar
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-bold text-rose-900">
                Reg. {c.registro_motorista_cobranca}
              </span>
              <span className="text-sm font-medium text-rose-800">
                {c.nome_motorista_cobranca || '—'}
              </span>
            </div>
          </div>

          {(c.justificativa_juridico_1 || c.justificativa_diretoria_2) && (
            <div className="text-xs text-slate-600 bg-slate-50 border rounded-md p-2">
              {c.justificativa_juridico_1 && (
                <div>
                  <span className="font-semibold">Justificativa 1ª etapa: </span>
                  {c.justificativa_juridico_1}
                </div>
              )}
              {c.justificativa_diretoria_2 && (
                <div>
                  <span className="font-semibold">Justificativa diretoria: </span>
                  {c.justificativa_diretoria_2}
                </div>
              )}
            </div>
          )}

          {pendenteGestor && podeAprovarEtapa1 && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-[#225f3d] hover:bg-[#1b4a30] text-white"
                disabled={actionLoading === c.id}
                onClick={() => handleAprovar(c)}
              >
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={actionLoading === c.id}
                onClick={() => abrirReprovacao(c)}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Reprovar
              </Button>
            </div>
          )}

          {pendenteDiretoria && (
            <div className="flex flex-wrap items-center gap-2">
              {podeAprovarDiretoria ? (
                <>
                  <Button
                    size="sm"
                    className="bg-[#225f3d] hover:bg-[#1b4a30] text-white"
                    disabled={actionLoading === c.id}
                    onClick={() => handleAprovar(c)}
                  >
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    Aprovar ({(c.aprovacoes_diretoria_cobranca || []).length}/2)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    disabled={actionLoading === c.id}
                    onClick={() => abrirReprovacao(c)}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Reprovar
                  </Button>
                </>
              ) : (
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  {jaAproveiDiretoria
                    ? 'Seu voto já foi registrado — aguardando o 2º diretor'
                    : 'Aguardando aprovação da Diretoria (2/2)'}
                </div>
              )}
              <div className="text-[11px] text-slate-400">
                Votos: {(c.aprovacoes_diretoria_cobranca || []).length}/2
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Gavel className="h-5 w-5 text-[#225f3d]" />
              Aprovação de Cobrança — Jurídico
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isDiretoria && !isTi && !isAdmin
                ? '2ª etapa: aprovação da Diretoria (Leandro Ferraz e Dona Sonia, 2/2)'
                : '1ª etapa: Claudinei/Bianca · 2ª etapa: Diretoria (2/2)'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchChamados} disabled={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'pendente' | 'aprovados')}>
          <TabsList>
            <TabsTrigger value="pendente">
              Pendentes {pendentesVisiveis.length > 0 && `(${pendentesVisiveis.length})`}
            </TabsTrigger>
            <TabsTrigger value="aprovados">Histórico ({concluidos.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'pendente' ? (
          pendentesVisiveis.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum chamado pendente de aprovação.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">{pendentesVisiveis.map(renderCard)}</div>
          )
        ) : (
          <>
            {concluidos.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum chamado no histórico ainda.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">{concluidos.map(renderCard)}</div>
            )}
          </>
        )}
      </div>

      <Dialog
        open={reprovarChamadoId !== null}
        onOpenChange={(o) => !o && setReprovarChamadoId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reprovar cobrança</DialogTitle>
            <DialogDescription>
              Informe a justificativa da reprovação{' '}
              {etapaReprovacao === '1' ? '(1ª etapa — Claudinei/Bianca)' : '(2ª etapa — Diretoria)'}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="justificativa-reprovacao">Justificativa *</Label>
            <Textarea
              id="justificativa-reprovacao"
              placeholder="Descreva o motivo da reprovação..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReprovarChamadoId(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReprovar}
              disabled={actionLoading === reprovarChamadoId || !justificativa.trim()}
            >
              Confirmar Reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
