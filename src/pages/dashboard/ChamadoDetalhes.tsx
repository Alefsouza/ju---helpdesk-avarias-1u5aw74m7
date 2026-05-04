import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  User,
  Clock,
  FileText,
  Music,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Chamado = any
type Perfil = any
type Anexo = any
type TimelineItem = {
  id: string
  type: 'history' | 'response'
  acao?: string
  detalhes?: string | null
  mensagem?: string
  criado_em: string
  usuario: Perfil | null
}

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-800 border-blue-200',
  em_atendimento: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  finalizado: 'bg-green-100 text-green-800 border-green-200',
}
const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_atendimento: 'Em Atendimento',
  finalizado: 'Finalizado',
}
const prioridadeColors: Record<string, string> = {
  baixa: 'bg-slate-100 text-slate-800 border-slate-200',
  media: 'bg-orange-100 text-orange-800 border-orange-200',
  alta: 'bg-red-100 text-red-800 border-red-200',
}
const prioridadeLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

export default function ChamadoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [chamado, setChamado] = useState<Chamado | null>(null)
  const [solicitante, setSolicitante] = useState<Perfil | null>(null)
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<Perfil | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchChamadoData = async () => {
    if (!id) return

    const { data: chamadoData, error: chamadoError } = await supabase
      .from('chamados')
      .select('*')
      .eq('id', id)
      .single()

    if (chamadoError) {
      toast.error('Erro ao carregar chamado')
      setLoading(false)
      return
    }
    setChamado(chamadoData)

    const { data: solicitanteData } = await supabase
      .from('perfil_usuario')
      .select('*')
      .eq('id', chamadoData.usuario_id)
      .single()
    if (solicitanteData) setSolicitante(solicitanteData)

    if (user) {
      const { data: currUser } = await supabase
        .from('perfil_usuario')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUserProfile(currUser)
    }

    const { data: anexosData } = await supabase
      .from('anexos_chamado')
      .select('*')
      .eq('chamado_id', id)
    if (anexosData) setAnexos(anexosData)

    const { data: respostasData } = await supabase
      .from('respostas_chamado')
      .select('*')
      .eq('chamado_id', id)
    const { data: historicoData } = await supabase
      .from('historico_chamado')
      .select('*')
      .eq('chamado_id', id)

    const userIds = new Set<string>()
    if (solicitanteData) userIds.add(solicitanteData.id)
    respostasData?.forEach((r) => userIds.add(r.usuario_id))
    historicoData?.forEach((h) => userIds.add(h.usuario_id))

    const { data: profilesData } = await supabase
      .from('perfil_usuario')
      .select('*')
      .in('id', Array.from(userIds))
    const profilesMap: Record<string, Perfil> = {}
    profilesData?.forEach((p) => {
      profilesMap[p.id] = p
    })

    const timelineItems: TimelineItem[] = []
    respostasData?.forEach((r) => {
      timelineItems.push({
        id: r.id,
        type: 'response',
        mensagem: r.mensagem,
        criado_em: r.criado_em,
        usuario: profilesMap[r.usuario_id] || null,
      })
    })
    historicoData?.forEach((h) => {
      timelineItems.push({
        id: h.id,
        type: 'history',
        acao: h.acao,
        detalhes: h.detalhes,
        criado_em: h.criado_em,
        usuario: profilesMap[h.usuario_id] || null,
      })
    })

    timelineItems.sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
    setTimeline(timelineItems)
    setLoading(false)
  }

  useEffect(() => {
    fetchChamadoData()
    const channel = supabase
      .channel(`chamado_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'respostas_chamado', filter: `chamado_id=eq.${id}` },
        () => fetchChamadoData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'historico_chamado', filter: `chamado_id=eq.${id}` },
        () => fetchChamadoData(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chamados', filter: `id=eq.${id}` },
        () => fetchChamadoData(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  useEffect(() => {
    if (timeline.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [timeline])

  const handleResponder = async () => {
    if (!mensagem.trim()) return
    setSubmitting(true)
    const { error: respostaError } = await supabase.from('respostas_chamado').insert({
      chamado_id: id,
      usuario_id: user?.id,
      mensagem: mensagem.trim(),
    })
    if (respostaError) {
      toast.error('Erro ao enviar resposta')
      setSubmitting(false)
      return
    }

    const isSupportUser =
      currentUserProfile?.tipo_usuario === 'responsavel' ||
      currentUserProfile?.tipo_usuario === 'admin'

    if (!isSupportUser && chamado?.status === 'em_atendimento') {
      await supabase
        .from('chamados')
        .update({ status: 'aberto', atualizado_em: new Date().toISOString() })
        .eq('id', id)
    }

    await supabase.from('historico_chamado').insert({
      chamado_id: id,
      acao: 'respondido',
      usuario_id: user?.id,
    })

    setMensagem('')
    setSubmitting(false)
    toast.success('Resposta enviada')
  }

  const handleFinalizar = async () => {
    if (!window.confirm('Tem certeza que deseja finalizar este chamado?')) return
    setCompleting(true)
    const { error: updateError } = await supabase
      .from('chamados')
      .update({ status: 'finalizado', atualizado_em: new Date().toISOString() })
      .eq('id', id)
    if (updateError) {
      toast.error('Erro ao finalizar chamado')
      setCompleting(false)
      return
    }
    await supabase.from('historico_chamado').insert({
      chamado_id: id,
      acao: 'finalizado',
      usuario_id: user?.id,
    })
    setCompleting(false)
    toast.success('Chamado finalizado com sucesso')
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12 p-4">
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  if (!chamado) {
    return (
      <div className="max-w-5xl mx-auto p-4 text-center py-20">
        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Chamado não encontrado</h2>
        <Button onClick={() => navigate(-1)} className="mt-4" variant="outline">
          Voltar
        </Button>
      </div>
    )
  }

  const isSupport =
    currentUserProfile?.tipo_usuario === 'responsavel' ||
    currentUserProfile?.tipo_usuario === 'admin'
  const canFinalize = isSupport || chamado.usuario_id === user?.id

  const getAcaoText = (acao: string, userNome: string) => {
    switch (acao) {
      case 'criado':
        return `Chamado criado por ${userNome}`
      case 'atribuido':
        return `Atribuído a ${userNome}`
      case 'respondido':
        return `Respondido por ${userNome}`
      case 'finalizado':
        return `Finalizado por ${userNome}`
      case 'deletado':
        return `Deletado por ${userNome}`
      default:
        return `Ação ${acao} por ${userNome}`
    }
  }

  const renderAnexo = (anexo: Anexo) => {
    const isImage = anexo.tipo_arquivo.includes('image')
    const isVideo = anexo.tipo_arquivo.includes('video')
    const isAudio = anexo.tipo_arquivo.includes('audio')

    if (isImage) {
      return (
        <a
          key={anexo.id}
          href={anexo.url_arquivo}
          target="_blank"
          rel="noreferrer"
          className="block relative group overflow-hidden rounded-md border aspect-video bg-slate-100"
        >
          <img
            src={anexo.url_arquivo}
            alt={anexo.nome_arquivo}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-xs text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
            {anexo.nome_arquivo}
          </div>
        </a>
      )
    }
    if (isVideo) {
      return (
        <div
          key={anexo.id}
          className="rounded-md border overflow-hidden aspect-video relative bg-black"
        >
          <video src={anexo.url_arquivo} controls className="w-full h-full" />
        </div>
      )
    }
    if (isAudio) {
      return (
        <div
          key={anexo.id}
          className="rounded-md border p-4 flex flex-col gap-2 bg-slate-50 items-center justify-center h-full aspect-video"
        >
          <Music className="h-8 w-8 text-slate-400" />
          <span className="text-xs truncate w-full text-center" title={anexo.nome_arquivo}>
            {anexo.nome_arquivo}
          </span>
          <audio src={anexo.url_arquivo} controls className="w-full h-8" />
        </div>
      )
    }
    return (
      <a
        key={anexo.id}
        href={anexo.url_arquivo}
        target="_blank"
        rel="noreferrer"
        className="rounded-md border p-4 flex flex-col gap-2 bg-slate-50 items-center justify-center aspect-video hover:bg-slate-100 transition-colors"
      >
        <FileText className="h-10 w-10 text-red-400" />
        <span
          className="text-sm font-medium truncate w-full text-center text-slate-700"
          title={anexo.nome_arquivo}
        >
          {anexo.nome_arquivo}
        </span>
        <span className="text-xs text-slate-500">{anexo.tamanho_mb} MB</span>
      </a>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 p-4 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-4 w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        {chamado.status !== 'finalizado' && canFinalize && (
          <Button
            variant="outline"
            className="text-green-600 border-green-200 hover:bg-green-50 w-full sm:w-auto"
            onClick={handleFinalizar}
            disabled={completing}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {completing ? 'Finalizando...' : 'Finalizar Chamado'}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {chamado.id}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider',
                  statusColors[chamado.status],
                )}
              >
                {statusLabels[chamado.status]}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider',
                  prioridadeColors[chamado.prioridade],
                )}
              >
                {prioridadeLabels[chamado.prioridade]}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{chamado.titulo}</h1>
            <p className="text-sm font-medium text-primary bg-primary/10 w-fit px-3 py-1 rounded-full">
              {chamado.assunto}
            </p>
          </div>
          <div className="text-sm text-slate-500 flex flex-col sm:items-end gap-1 bg-slate-50 p-3 rounded-lg border">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {format(new Date(chamado.criado_em), "dd 'de' MMM, yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </div>
            {solicitante && (
              <div className="flex items-center gap-1 mt-1">
                <User className="h-4 w-4" />
                <span className="font-medium text-slate-700">{solicitante.nome_completo}</span>
              </div>
            )}
            {solicitante?.email && (
              <div className="text-xs text-slate-400 pl-5">{solicitante.email}</div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
            Descrição
          </h3>
          <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm bg-slate-50 p-4 rounded-lg border">
            {chamado.descricao}
          </div>
        </div>

        {anexos.length > 0 && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-2">
              Anexos <Badge variant="secondary">{anexos.length}</Badge>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {anexos.map(renderAnexo)}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 px-1">Histórico de Interações</h3>
        <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-6 flex flex-col gap-6 max-h-[600px] overflow-y-auto">
          {timeline.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nenhuma interação registrada.</p>
          ) : (
            timeline.map((item, index) => {
              const isCurrentUser = item.usuario?.id === user?.id

              if (item.type === 'history') {
                return (
                  <div key={`${item.id}-${index}`} className="flex justify-center my-2">
                    <div className="bg-slate-100 text-slate-500 text-xs px-3 py-1.5 rounded-full flex items-center gap-2 font-medium border">
                      <Clock className="h-3 w-3" />
                      {getAcaoText(item.acao!, item.usuario?.nome_completo || 'Sistema')} -{' '}
                      {format(new Date(item.criado_em), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={`${item.id}-${index}`}
                  className={cn('flex w-full', isCurrentUser ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3 shadow-sm',
                      isCurrentUser
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-slate-100 text-slate-800 rounded-tl-sm border',
                    )}
                  >
                    {!isCurrentUser && (
                      <div className="font-bold text-xs mb-1 text-primary">
                        {item.usuario?.nome_completo || 'Usuário'}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {item.mensagem}
                    </div>
                    <div
                      className={cn(
                        'text-[10px] mt-2 text-right opacity-70',
                        isCurrentUser ? 'text-primary-foreground/90' : 'text-slate-500',
                      )}
                    >
                      {format(new Date(item.criado_em), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {chamado.status !== 'finalizado' && (
        <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-6 animate-fade-in-up">
          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
            Responder
          </h3>
          <div className="flex flex-col gap-3">
            <Textarea
              placeholder="Digite sua resposta aqui..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="min-h-[120px] resize-y"
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleResponder}
                disabled={submitting || !mensagem.trim()}
                className="w-full sm:w-auto"
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? 'Enviando...' : 'Enviar Resposta'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
