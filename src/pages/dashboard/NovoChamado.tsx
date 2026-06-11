import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  UploadCloud,
  X,
  FileIcon,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  CalendarIcon,
} from 'lucide-react'

type FileCategory =
  | 'boletim'
  | 'orcamento_confianca'
  | 'orcamento_carmg'
  | 'cnh'
  | 'documento_veiculo'
  | 'fotos_videos'
  | 'anexo_lesao'
  | 'apolice'
  | 'valor_acordo'

const SEGURADORA_CATEGORIES = [
  {
    id: 'boletim' as const,
    title: 'Boletim de Ocorrência',
    description: 'Anexe o boletim de ocorrência do sinistro',
    required: true,
    min: 1,
    max: 1,
    accept: '.pdf,image/*',
    allowedPrefixes: ['application/pdf', 'image/'],
  },
  {
    id: 'apolice' as const,
    title: 'Apólice',
    description: 'Anexe a apólice do seguro',
    required: true,
    min: 1,
    max: 1,
    accept: '.pdf,image/*',
    allowedPrefixes: ['application/pdf', 'image/'],
  },
  {
    id: 'valor_acordo' as const,
    title: 'Valor do acordo',
    description: 'Anexe o documento com o valor do acordo',
    required: true,
    min: 1,
    max: 1,
    accept: '.pdf,image/*',
    allowedPrefixes: ['application/pdf', 'image/'],
  },
]

const ATTACHMENT_CATEGORIES = [
  {
    id: 'boletim' as const,
    title: 'Boletim de Ocorrência',
    description: 'Anexe o boletim de ocorrência do sinistro',
    required: true,
    min: 1,
    max: 1,
    accept: '.pdf,image/*',
    allowedPrefixes: ['application/pdf', 'image/'],
  },
  {
    id: 'orcamento_confianca' as const,
    title: '02 Orçamentos de funilarias de sua confiança',
    description: 'Anexe 2 orçamentos de funilarias diferentes',
    required: true,
    min: 2,
    max: 2,
    accept: '.pdf,image/*',
    allowedPrefixes: ['application/pdf', 'image/'],
  },
  {
    id: 'orcamento_carmg' as const,
    title: '01 Orçamento da Nossa funilaria credenciada',
    description:
      'CARMG Funilaria e Pintura - R. Bom Pastor, 2454 - Ipiranga - Contato: (11) 94004-1866 / Marcos',
    required: true,
    min: 1,
    max: 1,
    accept: '.pdf,image/*',
    allowedPrefixes: ['application/pdf', 'image/'],
  },
  {
    id: 'cnh' as const,
    title: 'CNH',
    description: 'Anexe a Carteira Nacional de Habilitação do condutor',
    required: true,
    min: 1,
    max: 1,
    accept: '.pdf,image/*',
    allowedPrefixes: ['application/pdf', 'image/'],
  },
  {
    id: 'documento_veiculo' as const,
    title: 'Documento do veículo',
    description: 'Anexe o documento do veículo (CRLV ou RG do veículo)',
    required: true,
    min: 1,
    max: 1,
    accept: '.pdf,image/*',
    allowedPrefixes: ['application/pdf', 'image/'],
  },
  {
    id: 'fotos_videos' as const,
    title: 'Fotos e/ou vídeos do veículo avariado',
    description: 'Anexe fotos ou vídeos do veículo com os danos',
    required: false,
    min: 0,
    max: 10,
    accept: 'image/*,video/*',
    allowedPrefixes: ['image/', 'video/'],
  },
]

const LESAO_ATTACHMENT = {
  id: 'anexo_lesao' as const,
  title: 'Anexos (Opcional)',
  description: 'Anexe fotos, vídeos ou documentos relacionados à ocorrência',
  required: false,
  min: 0,
  max: 10,
  accept: '.pdf,image/*,video/*',
  allowedPrefixes: ['application/pdf', 'image/', 'video/'],
}

type FileItem = {
  id: string
  category: FileCategory
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  url?: string
  errorCount: number
  errorMessage?: string
}

const MAX_SIZE_MB = 20
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export default function NovoChamado() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [tipoChamado, setTipoChamado] = useState<'Colisão' | 'Lesão Corporal' | 'Seguradora' | ''>(
    '',
  )
  const [titulo, setTitulo] = useState('')
  const [dataOcorrencia, setDataOcorrencia] = useState<Date | undefined>(undefined)
  const [descricao, setDescricao] = useState('')
  const [placaOnibus, setPlacaOnibus] = useState('')
  const [identifiedGaragem, setIdentifiedGaragem] = useState<string | null>(null)
  const [identifiedPrefixo, setIdentifiedPrefixo] = useState<string | null>(null)
  const [isSearchingPlaca, setIsSearchingPlaca] = useState(false)

  const [files, setFiles] = useState<FileItem[]>([])
  const [dragActiveId, setDragActiveId] = useState<FileCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const DRAFT_KEY = 'draft-novo-chamado'
  const [draftRestored, setDraftRestored] = useState(false)
  const isRestoring = useRef(false)
  const isInitialMount = useRef(true)

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const isCompletelyEmpty =
          !parsed.tipoChamado &&
          !parsed.titulo &&
          !parsed.dataOcorrencia &&
          !parsed.descricao &&
          !parsed.placaOnibus

        if (!isCompletelyEmpty) {
          isRestoring.current = true
          if (parsed.tipoChamado) setTipoChamado(parsed.tipoChamado)
          if (parsed.titulo) setTitulo(parsed.titulo)
          if (parsed.dataOcorrencia) setDataOcorrencia(new Date(parsed.dataOcorrencia))
          if (parsed.descricao) setDescricao(parsed.descricao)
          if (parsed.placaOnibus) setPlacaOnibus(parsed.placaOnibus)
          setDraftRestored(true)

          setTimeout(() => {
            isRestoring.current = false
          }, 300)
        }
      } catch (e) {
        console.error('Failed to parse draft', e)
        isRestoring.current = false
      }
    }
  }, [])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (isRestoring.current) return

    const isCompletelyEmpty =
      !tipoChamado && !titulo && !dataOcorrencia && !descricao && !placaOnibus

    if (isCompletelyEmpty) {
      localStorage.removeItem(DRAFT_KEY)
    } else {
      const toSave = {
        tipoChamado,
        titulo,
        dataOcorrencia: dataOcorrencia?.toISOString(),
        descricao,
        placaOnibus,
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave))
    }
  }, [tipoChamado, titulo, dataOcorrencia, descricao, placaOnibus])

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setDraftRestored(false)
  }

  const categoriesToRender =
    tipoChamado === 'Lesão Corporal'
      ? [LESAO_ATTACHMENT]
      : tipoChamado === 'Seguradora'
        ? SEGURADORA_CATEGORIES
        : ATTACHMENT_CATEGORIES

  const getCategoryInfo = (id: FileCategory) => {
    if (id === 'anexo_lesao') return LESAO_ATTACHMENT
    return [...ATTACHMENT_CATEGORIES, ...SEGURADORA_CATEGORIES].find((c) => c.id === id)!
  }

  const processFiles = (newFiles: File[], categoryId: FileCategory) => {
    const categoryInfo = getCategoryInfo(categoryId)
    const currentFiles = files.filter((f) => f.category === categoryId)

    if (currentFiles.length + newFiles.length > categoryInfo.max) {
      toast.error(
        `Você pode enviar no máximo ${categoryInfo.max} arquivo(s) em ${categoryInfo.title}.`,
      )
      return
    }

    const itemsToUpload: FileItem[] = []

    for (const file of newFiles) {
      const isValidType = categoryInfo.allowedPrefixes.some((prefix) =>
        file.type.startsWith(prefix),
      )
      if (!isValidType) {
        toast.error(`Tipo de arquivo não permitido para esta categoria: ${file.name}`)
        continue
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`Arquivo muito grande (Máx 20MB): ${file.name}`)
        continue
      }

      const item: FileItem = {
        id: crypto.randomUUID(),
        category: categoryId,
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

  const uploadFile = async (item: FileItem) => {
    if (!user) return

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
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`

      const { error } = await supabase.storage
        .from('anexos')
        .upload(filePath, item.file, { upsert: false })

      clearInterval(interval)
      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from('anexos').getPublicUrl(filePath)

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: 'success', progress: 100, url: publicUrl } : f,
        ),
      )
    } catch (err) {
      clearInterval(interval)
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === item.id) {
            const count = f.errorCount + 1
            return {
              ...f,
              status: 'error',
              errorCount: count,
              errorMessage:
                count >= 3
                  ? 'Não conseguimos enviar este arquivo. Tente outro'
                  : 'Erro no envio. Tente novamente',
            }
          }
          return f
        }),
      )
    }
  }

  const handleDrop = (e: React.DragEvent, categoryId: FileCategory) => {
    e.preventDefault()
    setDragActiveId(null)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files), categoryId)
    }
  }

  const handleDragOver = (e: React.DragEvent, categoryId: FileCategory) => {
    e.preventDefault()
    setDragActiveId(categoryId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActiveId(null)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, categoryId: FileCategory) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files), categoryId)
    }
    e.target.value = ''
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const retryUpload = (item: FileItem) => {
    if (item.errorCount >= 3) return
    uploadFile(item)
  }

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const getTipoArquivo = (mime: string) => {
    if (mime.startsWith('audio/')) return 'audio'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('image/')) return 'imagem'
    if (mime === 'application/pdf') return 'pdf'
    return 'pdf'
  }

  useEffect(() => {
    if (!placaOnibus || placaOnibus.length !== 8) {
      setIdentifiedGaragem(null)
      setIdentifiedPrefixo(null)
      return
    }

    const searchTimer = setTimeout(async () => {
      setIsSearchingPlaca(true)
      try {
        const cleanSearch = placaOnibus.replace(/[^a-zA-Z0-9]/g, '')

        const { data, error } = await supabase.rpc(
          'buscar_veiculo_por_placa' as any,
          {
            p_placa: cleanSearch,
          } as any,
        )

        if (error) throw error

        const result = data as { garagem: string; prefixo: string } | null

        if (result && result.garagem) {
          setIdentifiedGaragem(result.garagem)
          setIdentifiedPrefixo(result.prefixo)
        } else {
          setIdentifiedGaragem('NOT_FOUND')
          setIdentifiedPrefixo(null)
        }
      } catch (err) {
        console.error('Error searching frota:', err)
        setIdentifiedGaragem('NOT_FOUND')
        setIdentifiedPrefixo(null)
      } finally {
        setIsSearchingPlaca(false)
      }
    }, 500)

    return () => clearTimeout(searchTimer)
  }, [placaOnibus])

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (value.length > 3) {
      value = value.substring(0, 3) + ' ' + value.substring(3, 7)
    }
    setPlacaOnibus(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!tipoChamado) {
      toast.error('Selecione o tipo de chamado')
      return
    }

    if (!titulo.trim()) {
      toast.error('Título é obrigatório')
      return
    }

    if (!dataOcorrencia) {
      toast.error('A data da ocorrência é obrigatória')
      return
    }

    if (!descricao.trim()) {
      toast.error('A descrição é obrigatória')
      return
    }

    if (descricao.length < 20) {
      toast.error('A descrição deve ter no mínimo 20 caracteres')
      return
    }

    if (placaOnibus.length !== 8) {
      toast.error('A placa do ônibus deve conter 7 caracteres alfanuméricos')
      return
    }

    const hasIncomplete = files.some((f) => f.status !== 'success')
    if (hasIncomplete) {
      toast.error('Valide todos os anexos antes de enviar')
      return
    }

    if (tipoChamado === 'Colisão' || tipoChamado === 'Seguradora') {
      const catsToCheck =
        tipoChamado === 'Seguradora' ? SEGURADORA_CATEGORIES : ATTACHMENT_CATEGORIES
      const missingRequired = catsToCheck.some(
        (cat) => cat.required && files.filter((f) => f.category === cat.id).length === 0,
      )
      if (missingRequired) {
        toast.error('Preencha todos os campos obrigatórios')
        return
      }

      const wrongQuantity = catsToCheck.find((cat) => {
        const count = files.filter((f) => f.category === cat.id).length
        return count > 0 && count < cat.min
      })

      if (wrongQuantity) {
        if (wrongQuantity.id === 'orcamento_confianca') {
          toast.error('Mínimo 2 orçamentos obrigatório')
        } else {
          toast.error(`${wrongQuantity.title}: Mínimo de ${wrongQuantity.min} arquivo(s)`)
        }
        return
      }
    }

    setIsSubmitting(true)
    try {
      let finalTitulo = titulo
      if (
        profile?.tipo_usuario === 'basico' &&
        identifiedPrefixo &&
        identifiedGaragem !== 'NOT_FOUND'
      ) {
        finalTitulo = `${titulo} - Carro: ${identifiedPrefixo}`
      }

      if (tipoChamado === 'Seguradora') {
        const carroText = identifiedPrefixo || placaOnibus
        finalTitulo = `${titulo} - Carro: ${carroText}`
      }

      const { data: chamado, error: chamadoError } = await supabase
        .from('chamados')
        .insert({
          titulo: finalTitulo,
          descricao,
          tipo_chamado: tipoChamado,
          prioridade: null,
          usuario_id: user.id,
          responsavel_id: null,
          status: 'aberto',
          garagem: identifiedGaragem !== 'NOT_FOUND' ? identifiedGaragem : null,
          carro: placaOnibus,
          data_ocorrencia: format(dataOcorrencia, 'yyyy-MM-dd'),
          criado_em: new Date().toISOString(),
        } as any)
        .select()
        .single()

      if (chamadoError) throw chamadoError

      if (files.length > 0) {
        if (tipoChamado === 'Seguradora') {
          const documentosData = files.map((f) => {
            let tipo_doc = 'Boletim de Ocorrência'
            if (f.category === 'apolice') tipo_doc = 'Apólice'
            if (f.category === 'valor_acordo') tipo_doc = 'Valor do acordo'

            return {
              chamado_id: chamado.id,
              tipo_documento: tipo_doc,
              nome_arquivo: f.file.name,
              arquivo_url: f.url!,
            }
          })
          const { error: docError } = await supabase.from('documentos').insert(documentosData)
          if (docError) throw docError
        } else {
          let orcamentoCount = 1
          const anexosData = files.map((f) => {
            let categoryTitle = 'Anexo'

            if (tipoChamado === 'Lesão Corporal') {
              categoryTitle = 'Anexo Lesão Corporal'
            } else {
              categoryTitle =
                ATTACHMENT_CATEGORIES.find((c) => c.id === f.category)?.title || 'Anexo'

              if (f.category === 'orcamento_confianca') {
                categoryTitle = `Orçamento ${orcamentoCount}`
                orcamentoCount++
              } else if (f.category === 'orcamento_carmg') {
                categoryTitle = 'Orçamento CARMG'
              } else if (f.category === 'fotos_videos') {
                categoryTitle = 'Fotos/Vídeos'
              } else if (f.category === 'documento_veiculo') {
                categoryTitle = 'Documento do Veículo'
              } else if (f.category === 'boletim') {
                categoryTitle = 'Boletim de Ocorrência'
              }
            }

            return {
              chamado_id: chamado.id,
              url_arquivo: f.url!,
              nome_arquivo: `[${categoryTitle}] - ${f.file.name}`,
              tipo_arquivo: getTipoArquivo(f.file.type),
              tamanho_mb: Number((f.file.size / (1024 * 1024)).toFixed(2)),
            }
          })
          const { error: anexosError } = await supabase.from('anexos_chamado').insert(anexosData)
          if (anexosError) throw anexosError
        }
      }

      await supabase.from('historico_chamado').insert({
        chamado_id: chamado.id,
        acao: 'criado',
        usuario_id: user.id,
      })

      clearDraft()
      toast.success('Chamado aberto com sucesso')
      navigate(`/dashboard/chamados/${chamado.id}`)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao abrir chamado. Tente novamente')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSubmitDisabled =
    isSubmitting ||
    !tipoChamado ||
    files.some((f) => f.status !== 'success') ||
    !titulo.trim() ||
    !dataOcorrencia ||
    !descricao.trim() ||
    placaOnibus.length !== 8

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up p-4 mb-20">
      {draftRestored && (
        <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Rascunho Restaurado</h3>
              <p className="mt-1 text-sm">
                Encontramos dados preenchidos anteriormente. Por questões de segurança,{' '}
                <strong>anexos e fotos</strong> precisam ser adicionados novamente.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDraftRestored(false)}
            className="-mt-2 -mr-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Abrir Novo Chamado</h1>
        <p className="text-muted-foreground mt-2">
          Selecione o tipo de ocorrência e preencha os dados necessários.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipoChamado">Tipo de Ocorrência *</Label>
                <Select
                  value={tipoChamado}
                  onValueChange={(val: 'Colisão' | 'Lesão Corporal' | 'Seguradora') => {
                    setTipoChamado(val)
                    setFiles([])
                    setTitulo('')
                    setDataOcorrencia(undefined)
                    setDescricao('')
                    setPlacaOnibus('')
                    setIdentifiedGaragem(null)
                    setIdentifiedPrefixo(null)
                  }}
                >
                  <SelectTrigger id="tipoChamado" className="bg-white">
                    <SelectValue placeholder="Selecione o tipo de chamado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Colisão">Colisão (Danos ao veículo)</SelectItem>
                    <SelectItem value="Lesão Corporal">Lesão Corporal (Física)</SelectItem>
                    <SelectItem value="Seguradora">Seguradora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {tipoChamado && (
              <div className="space-y-8 animate-fade-in">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="placaOnibus">Placa do nosso ônibus *</Label>
                    <Input
                      id="placaOnibus"
                      placeholder="Ex: ABC 1234"
                      value={placaOnibus}
                      onChange={handlePlacaChange}
                      maxLength={8}
                      required
                    />
                    {isSearchingPlaca && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Buscando veículo...
                      </p>
                    )}
                    {!isSearchingPlaca && identifiedGaragem === 'NOT_FOUND' && (
                      <p className="text-sm text-red-500 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> Veículo não encontrado na base da frota
                      </p>
                    )}
                    {!isSearchingPlaca &&
                      identifiedGaragem &&
                      identifiedGaragem !== 'NOT_FOUND' && (
                        <p className="text-sm text-green-600 font-medium flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3 w-3" /> Veículo identificado: Garagem{' '}
                          {identifiedGaragem}
                          {identifiedPrefixo && ` - Carro: ${identifiedPrefixo}`}
                        </p>
                      )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título *</Label>
                    <Input
                      id="titulo"
                      placeholder={
                        tipoChamado === 'Colisão'
                          ? 'Ex: Colisão na lateral direita'
                          : 'Ex: Queda de passageiro no interior do veículo'
                      }
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2 flex flex-col">
                    <Label htmlFor="dataOcorrencia">Data da Ocorrência *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'justify-start text-left font-normal',
                            !dataOcorrencia && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataOcorrencia ? (
                            format(dataOcorrencia, 'PPP', { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataOcorrencia}
                          onSelect={setDataOcorrencia}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Descreva detalhadamente a ocorrência..."
                      className="min-h-[120px]"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-base font-semibold">
                      {tipoChamado === 'Lesão Corporal'
                        ? 'Anexos (Opcional)'
                        : 'Anexos Necessários'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {tipoChamado === 'Lesão Corporal'
                        ? 'Você pode anexar fotos ou documentos relacionados à ocorrência.'
                        : 'Forneça as documentações abaixo para a abertura do sinistro.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {categoriesToRender.map((cat) => {
                      const catFiles = files.filter((f) => f.category === cat.id)
                      return (
                        <div
                          key={cat.id}
                          className="space-y-3 p-4 border rounded-lg bg-slate-50/50"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <Label className="text-sm font-medium flex items-center gap-2">
                                {cat.title}
                                {cat.required ? (
                                  <span className="text-red-600 text-[10px] font-medium bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Obrigatório
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px] font-medium bg-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Opcional
                                  </span>
                                )}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                {cat.description}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap bg-white px-2 py-1 rounded-md border font-medium">
                              {catFiles.length} / {cat.max}
                            </span>
                          </div>

                          {catFiles.length < cat.max && (
                            <div
                              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${dragActiveId === cat.id ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'}`}
                              onDrop={(e) => handleDrop(e, cat.id)}
                              onDragOver={(e) => handleDragOver(e, cat.id)}
                              onDragLeave={handleDragLeave}
                              onClick={() =>
                                document.getElementById(`file-upload-${cat.id}`)?.click()
                              }
                            >
                              <UploadCloud
                                className={`h-8 w-8 ${dragActiveId === cat.id ? 'text-primary' : 'text-slate-400'}`}
                              />
                              <div className="text-sm font-medium mt-1">
                                Clique ou arraste{' '}
                                {cat.max > 1 ? 'arquivos aqui' : 'um arquivo aqui'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {cat.id === 'fotos_videos' || cat.id === 'anexo_lesao'
                                  ? 'PDF, Imagens ou Vídeos'
                                  : 'PDF ou Imagens'}{' '}
                                (Máx 20MB cada)
                              </div>
                              <input
                                id={`file-upload-${cat.id}`}
                                type="file"
                                className="hidden"
                                onChange={(e) => handleFileInput(e, cat.id)}
                                multiple={cat.max > 1}
                                accept={cat.accept}
                              />
                            </div>
                          )}

                          {catFiles.length > 0 && (
                            <div className="space-y-2 mt-3">
                              {catFiles.map((f) => (
                                <div
                                  key={f.id}
                                  className={`flex items-center gap-3 p-2.5 border rounded-md shadow-sm ${f.status === 'error' ? 'border-red-200 bg-red-50/50' : 'bg-white'}`}
                                >
                                  <div className="bg-slate-100 p-1.5 rounded shrink-0">
                                    <FileIcon className="h-4 w-4 text-slate-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                      <p className="text-sm font-medium truncate pr-4">
                                        {f.file.name}
                                      </p>
                                      <span className="text-[10px] text-slate-500 shrink-0">
                                        {formatSize(f.file.size)}
                                      </span>
                                    </div>

                                    {f.status === 'uploading' && (
                                      <div className="space-y-1">
                                        <Progress value={f.progress} className="h-1" />
                                        <p className="text-[10px] text-slate-500">Enviando...</p>
                                      </div>
                                    )}

                                    {f.status === 'success' && (
                                      <div className="flex items-center gap-1 text-green-600 text-[10px] font-medium">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Enviado
                                      </div>
                                    )}

                                    {f.status === 'error' && (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1 text-red-600 text-[10px] font-medium">
                                          <AlertCircle className="h-3 w-3" />
                                          {f.errorMessage}
                                        </div>
                                        {f.errorCount < 3 && (
                                          <button
                                            type="button"
                                            onClick={() => retryUpload(f)}
                                            className="text-[10px] text-red-600 underline flex items-center gap-1 w-fit hover:text-red-700"
                                          >
                                            <RefreshCw className="h-2.5 w-2.5" /> Tentar novamente
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(f.id)}
                                    className="shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6 bg-slate-50/50 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/meus-chamados')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <div className="flex items-center gap-3">
              {files.some((f) => f.status !== 'success') && files.length > 0 && (
                <span className="text-sm text-amber-600 font-medium hidden sm:inline-block">
                  Aguarde o envio dos anexos
                </span>
              )}
              <Button type="submit" disabled={isSubmitDisabled}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Abrindo...
                  </>
                ) : (
                  'Abrir Chamado'
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
