import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  User,
  Clock,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  AlertCircle,
  Paperclip,
  X,
  RefreshCw,
  ArrowRightLeft,
  Loader2,
  Trash2,
  Download,
  Link as LinkIcon,
  Copy,
  Share2,
  MoreVertical,
  Eye,
  RotateCcw,
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
type AnexoInterno = {
  id: string
  chamado_id: string
  usuario_id: string
  arquivo_url: string
  nome_arquivo: string
  tamanho_bytes: number
  tipo_arquivo: string
  criado_em: string
}
type TimelineItem = {
  id: string
  type: 'history' | 'response'
  acao?: string
  detalhes?: string | null
  mensagem?: string
  criado_em: string
  usuario: Perfil | null
  anexos?: Anexo[]
}

type FileItem = {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  url?: string
  errorCount: number
  errorMessage?: string
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
  urgente: 'bg-red-600 text-white border-red-700',
}
const prioridadeLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

const MAX_FILES = 10
const MAX_SIZE_MB = 20
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const ALLOWED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'video/mp4',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

export default function ChamadoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [chamado, setChamado] = useState<Chamado | null>(null)
  const [solicitante, setSolicitante] = useState<Perfil | null>(null)
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [anexosInternos, setAnexosInternos] = useState<AnexoInterno[]>([])
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<Perfil | null>(null)

  const [pia, setPia] = useState('')
  const [savingPia, setSavingPia] = useState(false)
  const [prioridade, setPrioridade] = useState('')
  const [savingPrioridade, setSavingPrioridade] = useState(false)
  const [tipoChamado, setTipoChamado] = useState('')
  const [savingTipoChamado, setSavingTipoChamado] = useState(false)

  const [files, setFiles] = useState<FileItem[]>([])
  const [isDragActive, setIsDragActive] = useState(false)

  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [confirmReabrirOpen, setConfirmReabrirOpen] = useState(false)
  const [availableResponsaveis, setAvailableResponsaveis] = useState<Perfil[]>([])
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>('')
  const [transferObservacao, setTransferObservacao] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [uploadingInternal, setUploadingInternal] = useState(false)
  const [viewingInternalId, setViewingInternalId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const internalFileInputRef = useRef<HTMLInputElement>(null)
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
    setPia(chamadoData.pia || '')
    setPrioridade(chamadoData.prioridade || '')
    setTipoChamado(chamadoData.tipo_chamado || '')

    const { data: solicitanteData } = await supabase
      .from('perfil_usuario')
      .select('id, nome_completo, email')
      .eq('id', chamadoData.usuario_id)
      .maybeSingle()

    setSolicitante(solicitanteData || null)

    let currUser = null
    if (user) {
      const { data } = await supabase.from('perfil_usuario').select('*').eq('id', user.id).single()
      currUser = data
      setCurrentUserProfile(currUser)
    }

    let internalAttachments: AnexoInterno[] = []
    if (
      currUser &&
      (currUser.tipo_usuario === 'responsavel' || currUser.tipo_usuario === 'admin')
    ) {
      const { data: anexosInt } = await supabase
        .from('anexos_chamado_interno')
        .select('*')
        .eq('chamado_id', id)
      internalAttachments = anexosInt || []
    }
    setAnexosInternos(internalAttachments)

    const { data: anexosData } = await supabase
      .from('anexos_chamado')
      .select('*')
      .eq('chamado_id', id)

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

    const cTime = chamadoData ? new Date(chamadoData.criado_em).getTime() : 0
    const anexosByResposta: Record<string, Anexo[]> = {}
    const chamadosAnexos: Anexo[] = []

    if (anexosData) {
      anexosData.forEach((anexo) => {
        const aTime = new Date(anexo.criado_em).getTime()
        let closestRespId: string | null = null
        let minDiff = Infinity

        respostasData?.forEach((resp) => {
          const rTime = new Date(resp.criado_em).getTime()
          const diff = Math.abs(aTime - rTime)
          if (diff < minDiff && diff <= 15000) {
            minDiff = diff
            closestRespId = resp.id
          }
        })

        const diffChamado = Math.abs(aTime - cTime)
        if (closestRespId && minDiff < diffChamado) {
          if (!anexosByResposta[closestRespId]) anexosByResposta[closestRespId] = []
          anexosByResposta[closestRespId].push(anexo)
        } else {
          chamadosAnexos.push(anexo)
        }
      })
      setAnexos(chamadosAnexos)
    }

    const timelineItems: TimelineItem[] = []
    respostasData?.forEach((r) => {
      timelineItems.push({
        id: r.id,
        type: 'response',
        mensagem: r.mensagem,
        criado_em: r.criado_em,
        usuario: profilesMap[r.usuario_id] || null,
        anexos: anexosByResposta[r.id] || [],
      })
    })
    historicoData?.forEach((h) => {
      if (
        h.detalhes === 'Boletim de Ocorrência preenchido e anexado com sucesso.' ||
        h.detalhes === 'Espelho de Danos preenchido e anexado com sucesso.' ||
        h.detalhes?.toLowerCase().includes('anexo interno')
      ) {
        return
      }

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
        {
          event: 'INSERT',
          schema: 'public',
          table: 'respostas_chamado',
          filter: `chamado_id=eq.${id}`,
        },
        async (payload) => {
          const newResposta = payload.new as any
          const { data: profile } = await supabase
            .from('perfil_usuario')
            .select('*')
            .eq('id', newResposta.usuario_id)
            .single()

          setTimeline((prev) => {
            if (prev.some((item) => item.id === newResposta.id)) return prev

            const newItem: TimelineItem = {
              id: newResposta.id,
              type: 'response',
              mensagem: newResposta.mensagem,
              criado_em: newResposta.criado_em,
              usuario: profile || null,
              anexos: [],
            }

            return [...prev, newItem].sort(
              (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
            )
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historico_chamado',
          filter: `chamado_id=eq.${id}`,
        },
        async (payload) => {
          const newHistory = payload.new as any

          if (
            newHistory.detalhes === 'Boletim de Ocorrência preenchido e anexado com sucesso.' ||
            newHistory.detalhes === 'Espelho de Danos preenchido e anexado com sucesso.' ||
            newHistory.detalhes?.toLowerCase().includes('anexo interno')
          ) {
            return
          }

          const { data: profile } = await supabase
            .from('perfil_usuario')
            .select('*')
            .eq('id', newHistory.usuario_id)
            .single()

          setTimeline((prev) => {
            if (prev.some((item) => item.id === newHistory.id)) return prev

            const newItem: TimelineItem = {
              id: newHistory.id,
              type: 'history',
              acao: newHistory.acao,
              detalhes: newHistory.detalhes,
              criado_em: newHistory.criado_em,
              usuario: profile || null,
            }

            return [...prev, newItem].sort(
              (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
            )
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'anexos_chamado',
          filter: `chamado_id=eq.${id}`,
        },
        () => fetchChamadoData(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chamados', filter: `id=eq.${id}` },
        (payload) => {
          setChamado(payload.new as any)
          if (payload.new.pia !== undefined) {
            setPia(payload.new.pia || '')
          }
          if (payload.new.prioridade !== undefined) {
            setPrioridade(payload.new.prioridade || '')
          }
          if (payload.new.tipo_chamado !== undefined) {
            setTipoChamado(payload.new.tipo_chamado || '')
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'anexos_chamado_interno',
          filter: `chamado_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAnexo = payload.new as AnexoInterno
            setAnexosInternos((prev) => {
              if (prev.some((a) => a.id === newAnexo.id)) return prev
              return [...prev, newAnexo]
            })

            toast.custom(
              (t) => (
                <div className="bg-white border border-slate-200 border-l-4 border-l-primary rounded-lg shadow-lg p-4 flex gap-3 items-start w-full sm:w-[350px] max-w-[90vw]">
                  <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Novo documento recebido
                    </h4>
                    <p className="text-sm text-slate-500 mt-1 leading-snug">
                      Um novo documento foi anexado ao chamado {id?.substring(0, 8)}.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          const el = document.getElementById('anexos-internos')
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            el.classList.add(
                              'ring-2',
                              'ring-primary',
                              'ring-offset-2',
                              'transition-all',
                              'duration-500',
                              'rounded-xl',
                            )
                            setTimeout(() => {
                              el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2')
                            }, 2000)
                          }
                          toast.dismiss(t as number | string)
                        }}
                      >
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => toast.dismiss(t as number | string)}
                      >
                        Fechar
                      </Button>
                    </div>
                  </div>
                </div>
              ),
              { duration: 5000, position: 'bottom-right' },
            )
          } else if (payload.eventType === 'DELETE') {
            setAnexosInternos((prev) => prev.filter((a) => a.id !== payload.old.id))
          }
        },
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

  const uploadFile = async (item: FileItem) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === item.id ? { ...f, status: 'uploading', progress: 0, errorMessage: undefined } : f,
      ),
    )

    const interval = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === item.id && f.status === 'uploading' && f.progress < 90) {
            return { ...f, progress: f.progress + 15 }
          }
          return f
        }),
      )
    }, 300)

    try {
      const ext = item.file.name.split('.').pop()
      const uuid = crypto.randomUUID()
      const filePath = `${id}/${uuid}.${ext}`

      const { error } = await supabase.storage
        .from('chamados')
        .upload(filePath, item.file, { upsert: false })

      clearInterval(interval)

      if (error) {
        throw error
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('chamados').getPublicUrl(filePath)

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: 'success', progress: 100, url: publicUrl } : f,
        ),
      )
    } catch (err: any) {
      clearInterval(interval)
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === item.id) {
            return {
              ...f,
              status: 'error',
              errorCount: f.errorCount + 1,
              errorMessage: 'Erro ao enviar arquivo. Tente novamente',
            }
          }
          return f
        }),
      )
    }
  }

  const processFiles = (newFiles: File[]) => {
    if (files.length + newFiles.length > MAX_FILES) {
      toast.error(`Você pode enviar no máximo ${MAX_FILES} arquivos por resposta.`)
      return
    }

    const itemsToUpload: FileItem[] = []

    for (const file of newFiles) {
      const isValidType = ALLOWED_TYPES.includes(file.type) || file.type.startsWith('image/')
      if (!isValidType || file.size > MAX_SIZE_BYTES) {
        toast.error('Arquivo inválido. Máximo 20 MB. Tipos: MP3, MP4, imagens, PDF')
        continue
      }

      const item: FileItem = {
        id: crypto.randomUUID(),
        file,
        status: 'pending',
        progress: 0,
        errorCount: 0,
      }
      itemsToUpload.push(item)
    }

    if (itemsToUpload.length > 0) {
      setFiles((prev) => [...prev, ...itemsToUpload])
      itemsToUpload.forEach(uploadFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files))
      }
    },
    [files],
  )

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const retryUpload = (item: FileItem) => {
    uploadFile(item)
  }

  const handleInternalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    const MAX_INTERNAL_MB = 10
    const MAX_INTERNAL_BYTES = MAX_INTERNAL_MB * 1024 * 1024

    if (file.size > MAX_INTERNAL_BYTES) {
      toast.error('Arquivo muito grande. Máximo 10 MB.')
      return
    }

    setUploadingInternal(true)
    try {
      const ext = file.name.split('.').pop()
      const uuid = crypto.randomUUID()
      const filePath = `${id}/${uuid}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('anexos_chamados_interno')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('anexos_chamados_interno').getPublicUrl(filePath)

      const { data: newAnexo, error: dbError } = await supabase
        .from('anexos_chamado_interno')
        .insert({
          chamado_id: id as string,
          usuario_id: user?.id as string,
          arquivo_url: publicUrl,
          nome_arquivo: file.name,
          tamanho_bytes: file.size,
          tipo_arquivo: file.type || 'application/octet-stream',
        })
        .select()
        .single()

      if (dbError) throw dbError

      setAnexosInternos((prev) => {
        if (prev.some((a) => a.id === newAnexo.id)) return prev
        return [...prev, newAnexo]
      })

      toast.success('Anexo interno adicionado com sucesso')
    } catch (err: any) {
      toast.error('Erro ao fazer upload do anexo interno')
    } finally {
      setUploadingInternal(false)
      if (internalFileInputRef.current) internalFileInputRef.current.value = ''
    }
  }

  const handleDeleteInternal = async (anexoId: string, url: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este anexo interno?')) return

    try {
      const urlParts = url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const fileIdFolder = urlParts[urlParts.length - 2]
      const path = `${fileIdFolder}/${fileName}`

      await supabase.storage.from('anexos_chamados_interno').remove([path])

      const { error } = await supabase.from('anexos_chamado_interno').delete().eq('id', anexoId)
      if (error) throw error

      setAnexosInternos((prev) => prev.filter((a) => a.id !== anexoId))
      toast.success('Anexo interno deletado')
    } catch (error) {
      toast.error('Erro ao deletar anexo interno')
    }
  }

  const handleViewInternal = async (anexo: AnexoInterno) => {
    try {
      setViewingInternalId(anexo.id)
      const urlParts = anexo.arquivo_url.split('/anexos_chamados_interno/')
      const path = urlParts.length > 1 ? urlParts[1] : null

      let blob: Blob

      if (path) {
        const { data, error } = await supabase.storage
          .from('anexos_chamados_interno')
          .download(path)
        if (error) throw new Error('not_found')
        blob = data
      } else {
        const response = await fetch(anexo.arquivo_url)
        if (!response.ok) throw new Error('not_found')
        blob = await response.blob()
      }

      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err: any) {
      if (err.message === 'not_found') {
        toast.error('Arquivo não encontrado')
      } else {
        toast.error('Erro ao abrir documento')
      }
    } finally {
      setViewingInternalId(null)
    }
  }

  const handleDownloadInternal = async (anexo: AnexoInterno) => {
    try {
      const urlParts = anexo.arquivo_url.split('/anexos_chamados_interno/')
      const path = urlParts.length > 1 ? urlParts[1] : null

      let blob: Blob

      if (path) {
        const { data, error } = await supabase.storage
          .from('anexos_chamados_interno')
          .download(path)
        if (error) throw new Error('not_found')
        blob = data
      } else {
        const response = await fetch(anexo.arquivo_url)
        if (!response.ok) throw new Error('not_found')
        blob = await response.blob()
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = anexo.nome_arquivo
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      if (err.message === 'not_found') {
        toast.error('Arquivo não encontrado')
      } else {
        toast.error('Erro ao baixar arquivo. Tente novamente')
      }
    }
  }

  const getTipoArquivo = (mime: string) => {
    if (mime.startsWith('audio/')) return 'audio'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('image/')) return 'imagem'
    if (mime === 'application/pdf') return 'pdf'
    return 'pdf'
  }

  const loadResponsaveis = async () => {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('perfil_usuario')
      .select('id, nome_completo, email')
      .eq('tipo_usuario', 'responsavel')
      .neq('id', user.id)
      .order('nome_completo', { ascending: true })

    if (error) {
      toast.error('Erro ao carregar responsáveis. Tente novamente')
      return
    }

    setAvailableResponsaveis(data || [])
  }

  const handleOpenTransferModal = () => {
    loadResponsaveis()
    setTransferModalOpen(true)
  }

  const handleTransferir = async () => {
    if (!selectedResponsavel) return

    if (selectedResponsavel === chamado?.responsavel_id) {
      toast.error('Selecione um responsável diferente')
      return
    }

    const novoResponsavel = availableResponsaveis.find((r) => r.id === selectedResponsavel)
    if (
      !window.confirm(
        `Tem certeza que deseja transferir este chamado para ${novoResponsavel?.nome_completo}?`,
      )
    )
      return

    setTransferLoading(true)

    const { data, error: funcError } = await supabase.functions.invoke('transferir-chamado', {
      body: {
        chamado_id: id as string,
        novo_responsavel_id: selectedResponsavel,
        observacao: transferObservacao,
      },
    })

    if (funcError || data?.error) {
      console.error(funcError || data?.error)
      toast.error('Erro ao transferir chamado. Verifique suas permissões.')
      setTransferLoading(false)
      return
    }

    toast.success(`Chamado transferido com sucesso para ${novoResponsavel?.nome_completo}`)
    setTransferLoading(false)
    setTransferModalOpen(false)
    setTransferObservacao('')
    setSelectedResponsavel('')
  }

  const handleResponder = async () => {
    if (!mensagem.trim()) return
    const hasIncomplete = files.some((f) => f.status !== 'success')
    if (hasIncomplete) {
      toast.error('Aguarde o envio de todos os anexos ou remova os que apresentaram erro.')
      return
    }

    setSubmitting(true)

    const now = new Date().toISOString()
    const { error: respostaError } = await supabase.from('respostas_chamado').insert({
      chamado_id: id as string,
      usuario_id: user?.id as string,
      mensagem: mensagem.trim(),
      criado_em: now,
    })

    if (respostaError) {
      toast.error('Erro ao enviar resposta')
      setSubmitting(false)
      return
    }

    if (files.length > 0) {
      const uploadedAnexos = files.map((f) => ({
        chamado_id: id as string,
        url_arquivo: f.url!,
        nome_arquivo: f.file.name,
        tipo_arquivo: getTipoArquivo(f.file.type),
        tamanho_mb: Number((f.file.size / (1024 * 1024)).toFixed(2)),
        criado_em: now,
      }))

      const { error: anexosError } = await supabase.from('anexos_chamado').insert(uploadedAnexos)
      if (anexosError) {
        toast.error('Erro ao salvar anexos no banco de dados')
      }
    }

    const isSupportUser =
      currentUserProfile?.tipo_usuario === 'responsavel' ||
      currentUserProfile?.tipo_usuario === 'admin'

    if (!isSupportUser && chamado?.status === 'em_atendimento') {
      await supabase
        .from('chamados')
        .update({ status: 'aberto', atualizado_em: new Date().toISOString() })
        .eq('id', id as string)
    }

    await supabase.from('historico_chamado').insert({
      chamado_id: id as string,
      acao: 'respondido',
      usuario_id: user?.id as string,
    })

    setMensagem('')
    setFiles([])
    setSubmitting(false)
    toast.success(files.length > 0 ? 'Resposta enviada com anexos' : 'Resposta enviada')
  }

  const handleSalvarPrioridade = async (novaPrioridade: string) => {
    const isSupportUser =
      currentUserProfile?.tipo_usuario === 'responsavel' ||
      currentUserProfile?.tipo_usuario === 'admin'

    if (!isSupportUser) return

    setSavingPrioridade(true)
    setPrioridade(novaPrioridade)
    setChamado((prev: any) => (prev ? { ...prev, prioridade: novaPrioridade } : prev))

    const { error } = await supabase
      .from('chamados')
      .update({ prioridade: novaPrioridade, atualizado_em: new Date().toISOString() })
      .eq('id', id as string)

    setSavingPrioridade(false)
    if (error) {
      toast.error('Erro ao atualizar Prioridade. Tente novamente')
    } else {
      toast.success('Prioridade atualizada com sucesso')
    }
  }

  const handleSalvarTipoChamado = async (novoTipo: string) => {
    const isSupportUser =
      currentUserProfile?.tipo_usuario === 'responsavel' ||
      currentUserProfile?.tipo_usuario === 'admin'

    if (!isSupportUser) return

    setSavingTipoChamado(true)
    setTipoChamado(novoTipo)
    setChamado((prev: any) => (prev ? { ...prev, tipo_chamado: novoTipo } : prev))

    const { error } = await supabase
      .from('chamados')
      .update({ tipo_chamado: novoTipo, atualizado_em: new Date().toISOString() })
      .eq('id', id as string)

    setSavingTipoChamado(false)
    if (error) {
      toast.error('Erro ao atualizar Tipo de Chamado. Tente novamente')
    } else {
      toast.success('Tipo de Chamado atualizado com sucesso')
    }
  }

  const handleSalvarPia = async () => {
    const isSupportUser =
      currentUserProfile?.tipo_usuario === 'responsavel' ||
      currentUserProfile?.tipo_usuario === 'admin'

    if (!isSupportUser) return

    if (pia.trim() && !/^[A-Za-z0-9/\-.\s]+$/.test(pia.trim())) {
      toast.error('Informe um número válido de R.A.')
      return
    }

    setSavingPia(true)
    setChamado((prev: any) => (prev ? { ...prev, pia } : prev))
    const { error } = await supabase
      .from('chamados')
      .update({ pia })
      .eq('id', id as string)

    setSavingPia(false)
    if (error) {
      toast.error('Erro ao salvar R.A. Tente novamente')
    } else {
      toast.success('R.A. salvo com sucesso')
    }
  }

  const handleCopiarLinkIdo = async () => {
    try {
      const url = `${window.location.origin}/ido/${id}`
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado para a área de transferência')
    } catch (error) {
      toast.error('Erro ao gerar link. Tente novamente')
    }
  }

  const handleCompartilharIdo = async () => {
    try {
      const url = `${window.location.origin}/ido/${id}`
      if (navigator.share) {
        await navigator.share({
          title: `Formulário IDO - Chamado ${chamado?.titulo}`,
          text: 'Por favor, preencha o formulário IDO para o seu chamado.',
          url: url,
        })
      } else {
        handleCopiarLinkIdo()
      }
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        toast.error('Erro ao gerar link. Tente novamente')
      }
    }
  }

  const handleCopiarLinkEspelho = async () => {
    try {
      const url = `${window.location.origin}/espelho-danos/${id}`
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado para a área de transferência')
    } catch (error) {
      toast.error('Erro ao gerar link. Tente novamente')
    }
  }

  const handleCompartilharEspelho = async () => {
    try {
      const url = `${window.location.origin}/espelho-danos/${id}`
      if (navigator.share) {
        await navigator.share({
          title: `Formulário Espelho de Danos - Chamado ${chamado?.titulo}`,
          text: 'Por favor, preencha o formulário Espelho de Danos para o seu chamado.',
          url: url,
        })
      } else {
        handleCopiarLinkEspelho()
      }
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        toast.error('Erro ao gerar link. Tente novamente')
      }
    }
  }

  const handleReabrir = async () => {
    setCompleting(true)
    try {
      const { data, error: updateError } = await supabase
        .from('chamados')
        .update({
          status: 'aberto',
          responsavel_id: user?.id,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      if (!data) throw new Error('Falha ao atualizar chamado no banco')

      const { error: histError } = await supabase.from('historico_chamado').insert({
        chamado_id: id as string,
        acao: 'reaberto',
        usuario_id: user?.id as string,
      })

      if (histError) throw histError

      setChamado((prev: any) =>
        prev ? { ...prev, status: 'aberto', responsavel_id: user?.id } : prev,
      )
      setConfirmReabrirOpen(false)
      toast.success('Chamado reaberto com sucesso')

      navigate(`/dashboard/chamados/${id}`)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao reabrir chamado')
    } finally {
      setCompleting(false)
    }
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
  const isResponsible = chamado.responsavel_id === user?.id
  const isSolicitante = chamado.usuario_id === user?.id

  const canReply = isSolicitante || isResponsible
  const canFinalize = isSolicitante || isResponsible
  const canTransfer = isResponsible && chamado.status !== 'finalizado'
  const canEditRA = isSupport

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
      case 'transferido':
        return `Transferido por ${userNome}`
      case 'reaberto':
        return `Reaberto por ${userNome}`
      default:
        return `Ação ${acao} por ${userNome}`
    }
  }

  const renderAnexo = (anexo: Anexo) => {
    const isImage = anexo.tipo_arquivo.includes('imagem') || anexo.tipo_arquivo.includes('image')
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
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {canTransfer && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleOpenTransferModal}
              disabled={completing || transferLoading}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transferir Chamado
            </Button>
          )}
          {chamado.status !== 'finalizado' && canFinalize && (
            <Button
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50 w-full sm:w-auto"
              onClick={handleFinalizar}
              disabled={completing || transferLoading}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {completing ? 'Finalizando...' : 'Finalizar Chamado'}
            </Button>
          )}
          {chamado.status === 'finalizado' && isSupport && (
            <Button
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto"
              onClick={() => setConfirmReabrirOpen(true)}
              disabled={completing || transferLoading}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reabrir Chamado
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={cn(
                  'px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider',
                  statusColors[chamado.status],
                )}
              >
                {statusLabels[chamado.status]}
              </Badge>
              {chamado.tipo_chamado && (
                <Badge
                  variant="outline"
                  className="px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider bg-purple-100 text-purple-800 border-purple-200"
                >
                  {chamado.tipo_chamado}
                </Badge>
              )}
              {chamado.prioridade && prioridadeLabels[chamado.prioridade] && (
                <Badge
                  variant="outline"
                  className={cn(
                    'px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider',
                    prioridadeColors[chamado.prioridade],
                  )}
                >
                  {prioridadeLabels[chamado.prioridade]}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{chamado.titulo}</h1>
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
            <div className="flex items-center gap-1 mt-1">
              <User className="h-4 w-4" />
              <span className="font-medium text-slate-700">
                {solicitante ? solicitante.nome_completo : 'Usuário não encontrado'}
              </span>
            </div>
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

        {(isSupport || (chamado.pia && chamado.pia.trim() !== '')) && (
          <div className="pt-4 border-t">
            <div className="flex flex-col gap-4">
              {isSupport && (
                <div className="border border-orange-200 bg-orange-50/40 rounded-lg p-3 sm:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-1.5 shrink-0 sm:w-32">
                        <AlertCircle className="h-4 w-4 text-orange-700" />
                        <h3 className="text-sm font-semibold text-orange-800 uppercase tracking-wider">
                          Tipo de Chamado
                        </h3>
                      </div>
                      <div className="w-full">
                        <Select
                          value={tipoChamado || undefined}
                          onValueChange={handleSalvarTipoChamado}
                          disabled={savingTipoChamado || chamado.status === 'finalizado'}
                        >
                          <SelectTrigger className="bg-white border-orange-200 focus:ring-orange-400 h-9 text-sm">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Interno">Interno</SelectItem>
                            <SelectItem value="Externo">Externo</SelectItem>
                            <SelectItem value="Vítima">Vítima</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-1.5 shrink-0 sm:w-32">
                        <AlertCircle className="h-4 w-4 text-orange-700" />
                        <h3 className="text-sm font-semibold text-orange-800 uppercase tracking-wider">
                          Prioridade
                        </h3>
                      </div>
                      <div className="w-full">
                        <Select
                          value={prioridade || undefined}
                          onValueChange={handleSalvarPrioridade}
                          disabled={savingPrioridade || chamado.status === 'finalizado'}
                        >
                          <SelectTrigger className="bg-white border-orange-200 focus:ring-orange-400 h-9 text-sm">
                            <SelectValue placeholder="Selecione uma prioridade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-2 border-green-700 bg-[rgba(200,230,201,0.1)] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-green-800" />
                    <h3 className="text-base font-bold text-green-800 uppercase tracking-wider">
                      R.A.
                    </h3>
                  </div>
                  <Input
                    type="text"
                    placeholder="Informe o número de R.A."
                    value={pia}
                    onChange={(e) => setPia(e.target.value)}
                    className={cn(
                      'bg-white border-green-300 focus-visible:ring-green-700',
                      !canEditRA && 'opacity-70 disabled:cursor-default',
                    )}
                    disabled={savingPia || !canEditRA}
                  />
                </div>
                {canEditRA && (
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleSalvarPia}
                      disabled={savingPia}
                      className="bg-green-700 hover:bg-green-800 text-white w-full sm:w-auto"
                    >
                      {savingPia ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      {savingPia ? 'Salvando...' : 'Salvar R.A.'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isSupport && (
          <div className="pt-4 border-t space-y-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <LinkIcon className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-[12px] font-medium text-slate-700 shrink-0 hidden sm:inline-block">
                    Boletim de Ocorrência:
                  </span>
                  <span className="text-[12px] text-slate-500 truncate select-all">{`${window.location.origin}/ido/${id}`}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs px-2 sm:px-3 bg-white"
                    onClick={handleCopiarLinkIdo}
                  >
                    <Copy className="h-3.5 w-3.5 sm:mr-2" />
                    <span className="hidden sm:inline">Copiar</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCompartilharIdo}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Compartilhar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <LinkIcon className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-[12px] font-medium text-slate-700 shrink-0 hidden sm:inline-block">
                    Espelho de Danos:
                  </span>
                  <span className="text-[12px] text-slate-500 truncate select-all">{`${window.location.origin}/espelho-danos/${id}`}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs px-2 sm:px-3 bg-white"
                    onClick={handleCopiarLinkEspelho}
                  >
                    <Copy className="h-3.5 w-3.5 sm:mr-2" />
                    <span className="hidden sm:inline">Copiar</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCompartilharEspelho}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Compartilhar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        )}

        {isSupport && (
          <div className="pt-4 border-t" id="anexos-internos">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                Anexos Internos{' '}
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  {anexosInternos.length}
                </Badge>
              </h3>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                onClick={() => internalFileInputRef.current?.click()}
                disabled={uploadingInternal}
              >
                {uploadingInternal ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Paperclip className="mr-2 h-3 w-3" />
                )}
                Adicionar Anexo Interno
              </Button>
              <input
                type="file"
                ref={internalFileInputRef}
                onChange={handleInternalFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/gif"
              />
            </div>

            {anexosInternos.length > 0 ? (
              <div className="flex flex-col gap-2">
                {anexosInternos.map((anexo) => (
                  <div
                    key={anexo.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium text-slate-900 truncate"
                          title={anexo.nome_arquivo}
                        >
                          {anexo.nome_arquivo}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(anexo.tamanho_bytes / 1024 / 1024).toFixed(2)} MB •{' '}
                          {format(new Date(anexo.criado_em), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                        onClick={() => handleDownloadInternal(anexo)}
                        disabled={viewingInternalId === anexo.id}
                        title="Baixar anexo"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                        onClick={() => handleViewInternal(anexo)}
                        disabled={viewingInternalId === anexo.id}
                        title="Visualizar anexo"
                      >
                        {viewingInternalId === anexo.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      {user?.id === anexo.usuario_id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-500 hover:text-red-600"
                          onClick={() => handleDeleteInternal(anexo.id, anexo.arquivo_url)}
                          disabled={viewingInternalId === anexo.id}
                          title="Excluir anexo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 border border-dashed rounded-lg bg-slate-50">
                <p className="text-sm text-slate-500">Nenhum anexo interno registrado.</p>
              </div>
            )}
          </div>
        )}

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
                    <div className="bg-slate-100 text-slate-500 text-xs px-3 py-1.5 rounded-3xl sm:rounded-full flex flex-col sm:flex-row sm:items-center gap-2 font-medium border max-w-[90%] text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          {getAcaoText(item.acao!, item.usuario?.nome_completo || 'Sistema')} -{' '}
                          {format(new Date(item.criado_em), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                      {item.detalhes && (
                        <>
                          <span className="hidden sm:inline text-slate-300">|</span>
                          <span className="font-normal italic max-w-full truncate">
                            {item.detalhes}
                          </span>
                        </>
                      )}
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

                    {item.anexos && item.anexos.length > 0 && (
                      <div
                        className={cn(
                          'mt-3 space-y-2 pt-3 border-t',
                          isCurrentUser ? 'border-primary-foreground/20' : 'border-slate-200',
                        )}
                      >
                        {item.anexos.map((anexo) => {
                          const isImage =
                            anexo.tipo_arquivo.includes('imagem') ||
                            anexo.tipo_arquivo.includes('image')
                          const isVideo = anexo.tipo_arquivo.includes('video')
                          const isAudio = anexo.tipo_arquivo.includes('audio')

                          let Icon = FileText
                          if (isImage) Icon = ImageIcon
                          if (isVideo) Icon = Video
                          if (isAudio) Icon = Music

                          return (
                            <a
                              key={anexo.id}
                              href={anexo.url_arquivo}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                'flex items-center gap-3 p-2.5 rounded-lg border text-sm transition-colors text-left group',
                                isCurrentUser
                                  ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20 border-primary-foreground/20'
                                  : 'bg-white hover:bg-slate-50 border-slate-200',
                              )}
                            >
                              <Icon className="h-5 w-5 shrink-0 opacity-70" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{anexo.nome_arquivo}</p>
                                <p className="text-xs opacity-70">{anexo.tamanho_mb} MB</p>
                              </div>
                            </a>
                          )
                        })}
                      </div>
                    )}

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

      {chamado.status !== 'finalizado' && canReply && (
        <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-6 animate-fade-in-up">
          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
            Responder
          </h3>
          <div
            className={cn(
              'flex flex-col gap-3 rounded-lg border-2 border-dashed p-4 transition-colors bg-slate-50',
              isDragActive ? 'border-primary bg-primary/5' : 'hover:border-slate-300',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Textarea
              placeholder="Digite sua resposta aqui... (Você também pode arrastar arquivos para anexar)"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="min-h-[120px] resize-y bg-white"
              disabled={submitting}
            />

            {files.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-md border text-sm shadow-sm',
                      f.status === 'error' ? 'border-red-200 bg-red-50/50' : 'bg-white',
                    )}
                  >
                    <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className="truncate max-w-[200px] sm:max-w-[300px] font-medium"
                          title={f.file.name}
                        >
                          {f.file.name}
                        </span>
                        <span className="text-xs text-slate-500 shrink-0">
                          {(f.file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>

                      {f.status === 'uploading' && (
                        <div className="space-y-1.5 mt-1">
                          <Progress value={f.progress} className="h-1.5" />
                          <p className="text-[10px] text-slate-500 font-medium">Enviando...</p>
                        </div>
                      )}

                      {f.status === 'success' && (
                        <div className="flex items-center gap-1 text-green-600 text-[11px] font-medium mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Enviado
                        </div>
                      )}

                      {f.status === 'error' && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1 text-red-600 text-[11px] font-medium">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {f.errorMessage}
                          </div>
                          <button
                            onClick={() => retryUpload(f)}
                            className="text-[11px] text-slate-500 hover:text-slate-800 underline flex items-center gap-1"
                            disabled={submitting}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Tentar novamente
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="text-slate-400 hover:text-red-500 hover:bg-slate-100 p-1.5 rounded shrink-0 transition-colors"
                      disabled={submitting}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t mt-1">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-600 h-9 bg-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting || files.length >= MAX_FILES}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Anexar Arquivo
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                  accept=".mp3,.mp4,.pdf,image/jpeg,image/png,image/gif,image/webp"
                />
                <span className="text-xs text-slate-500 hidden sm:inline-block">
                  Máx 10 arquivos (20MB)
                </span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    setMensagem('')
                    setFiles([])
                  }}
                  disabled={submitting || (!mensagem && files.length === 0)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="h-9"
                  onClick={handleResponder}
                  disabled={
                    submitting || !mensagem.trim() || files.some((f) => f.status !== 'success')
                  }
                >
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? 'Enviando...' : 'Responder'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Transferir Chamado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Novo Responsável</Label>
              <Select
                value={selectedResponsavel}
                onValueChange={setSelectedResponsavel}
                disabled={transferLoading}
              >
                <SelectTrigger className="h-auto py-2 min-h-[40px]">
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {availableResponsaveis.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 text-center">
                      Nenhum outro responsável disponível
                    </div>
                  ) : (
                    availableResponsaveis.map((resp) => (
                      <SelectItem key={resp.id} value={resp.id}>
                        <div className="flex flex-col text-left py-0.5">
                          <span className="font-medium leading-none">{resp.nome_completo}</span>
                          <span className="text-[11px] text-slate-500 mt-1.5 leading-none">
                            {resp.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observação (Opcional)</Label>
              <Textarea
                placeholder="Motivo da transferência..."
                value={transferObservacao}
                onChange={(e) => setTransferObservacao(e.target.value)}
                disabled={transferLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferModalOpen(false)}
              disabled={transferLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleTransferir} disabled={!selectedResponsavel || transferLoading}>
              {transferLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {transferLoading ? 'Transferindo chamado...' : 'Transferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmReabrirOpen} onOpenChange={setConfirmReabrirOpen}>
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
              onClick={handleReabrir}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
