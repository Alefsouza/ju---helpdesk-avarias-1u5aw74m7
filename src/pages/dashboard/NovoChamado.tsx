import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  UploadCloud,
  X,
  FileIcon,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from 'lucide-react'

type FileItem = {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  url?: string
  errorCount: number
  errorMessage?: string
}

const MAX_FILES = 10
const MAX_SIZE_MB = 20
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const ALLOWED_TYPES = [
  'audio/mpeg',
  'video/mp4',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

export default function NovoChamado() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')

  const [files, setFiles] = useState<FileItem[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = (newFiles: File[]) => {
    if (files.length + newFiles.length > MAX_FILES) {
      toast.error(`Você pode enviar no máximo ${MAX_FILES} arquivos.`)
      return
    }

    const itemsToUpload: FileItem[] = []

    for (const file of newFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Tipo de arquivo não permitido: ${file.name}`)
        continue
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`Arquivo muito grande (Máx 20MB): ${file.name}`)
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragActive(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files))
      }
    },
    [files],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!titulo.trim()) {
      toast.error('Título é obrigatório')
      return
    }

    if (!descricao.trim()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (descricao.length < 20) {
      toast.error('A descrição deve ter no mínimo 20 caracteres')
      return
    }

    const hasIncomplete = files.some((f) => f.status !== 'success')
    if (hasIncomplete) {
      toast.error('Valide todos os anexos antes de enviar')
      return
    }

    setIsSubmitting(true)
    try {
      const { data: chamado, error: chamadoError } = await supabase
        .from('chamados')
        .insert({
          titulo,
          descricao,
          prioridade: null,
          usuario_id: user.id,
          responsavel_id: null,
          status: 'aberto',
          criado_em: new Date().toISOString(),
        } as any)
        .select()
        .single()

      if (chamadoError) throw chamadoError

      if (files.length > 0) {
        const anexosData = files.map((f) => ({
          chamado_id: chamado.id,
          url_arquivo: f.url!,
          nome_arquivo: f.file.name,
          tipo_arquivo: getTipoArquivo(f.file.type),
          tamanho_mb: Number((f.file.size / (1024 * 1024)).toFixed(2)),
        }))
        const { error: anexosError } = await supabase.from('anexos_chamado').insert(anexosData)
        if (anexosError) throw anexosError
      }

      await supabase.from('historico_chamado').insert({
        chamado_id: chamado.id,
        acao: 'criado',
        usuario_id: user.id,
      })

      toast.success('Chamado criado com sucesso')
      navigate(`/dashboard/chamados/${chamado.id}`)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao criar chamado. Tente novamente')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSubmitDisabled =
    isSubmitting || files.some((f) => f.status !== 'success') || !titulo.trim() || !descricao.trim()

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Criar Novo Chamado</h1>
        <p className="text-muted-foreground mt-2">
          Preencha os dados abaixo para abrir um novo ticket de suporte.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Problema de acesso"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva detalhadamente o seu problema ou solicitação..."
                  className="min-h-[120px]"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <Label>Anexos</Label>
                <span className="text-xs text-muted-foreground">
                  {files.length} de {MAX_FILES} arquivos
                </span>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${isDragActive ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud
                  className={`h-10 w-10 ${isDragActive ? 'text-primary' : 'text-slate-400'}`}
                />
                <div className="text-sm font-medium mt-2">Clique ou arraste arquivos aqui</div>
                <div className="text-xs text-muted-foreground">
                  MP3, MP4, PDF, Imagens (Máx 20MB cada)
                </div>
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileInput}
                  multiple
                  accept=".mp3,.mp4,.pdf,image/jpeg,image/png,image/gif,image/webp"
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-3 mt-4">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className={`flex items-center gap-4 p-3 border rounded-md ${f.status === 'error' ? 'border-red-200 bg-red-50/50' : 'bg-white'}`}
                    >
                      <div className="bg-slate-100 p-2 rounded shrink-0">
                        <FileIcon className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-medium truncate pr-4">{f.file.name}</p>
                          <span className="text-xs text-slate-500 shrink-0">
                            {formatSize(f.file.size)}
                          </span>
                        </div>

                        {f.status === 'uploading' && (
                          <div className="space-y-1">
                            <Progress value={f.progress} className="h-1.5" />
                            <p className="text-xs text-slate-500">Enviando...</p>
                          </div>
                        )}

                        {f.status === 'success' && (
                          <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Enviado
                          </div>
                        )}

                        {f.status === 'error' && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
                              <AlertCircle className="h-3.5 w-3.5" />
                              {f.errorMessage}
                            </div>
                            {f.errorCount < 3 && (
                              <button
                                type="button"
                                onClick={() => retryUpload(f)}
                                className="text-xs text-red-600 underline flex items-center gap-1 w-fit hover:text-red-700"
                              >
                                <RefreshCw className="h-3 w-3" /> Tentar novamente
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
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                  Valide todos os anexos antes de enviar
                </span>
              )}
              <Button type="submit" disabled={isSubmitDisabled}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar chamado'
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
