import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Eye,
  Download,
  Search,
  Wrench,
  CheckCircle,
  Camera,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

interface OsManutencaoProps {
  garagemFilter?: string
  title?: string
}

export default function OsManutencao({
  garagemFilter = 'Cursino',
  title = 'OS - Manutenção',
}: OsManutencaoProps) {
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [docToRelease, setDocToRelease] = useState<any>(null)
  const [isReleasing, setIsReleasing] = useState(false)
  const [viewDoc, setViewDoc] = useState<any>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [numeroOS, setNumeroOS] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [duplicateAlertOpen, setDuplicateAlertOpen] = useState(false)
  const [duplicateSubmitAction, setDuplicateSubmitAction] = useState<(() => void) | null>(null)
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false)
  const [photoManagerDoc, setPhotoManagerDoc] = useState<any>(null)

  const [stagedNewPhotos, setStagedNewPhotos] = useState<File[]>([])
  const [stagedNewPhotoUrls, setStagedNewPhotoUrls] = useState<string[]>([])
  const [stagedDeletedPhotos, setStagedDeletedPhotos] = useState<string[]>([])
  const [isSavingPhotos, setIsSavingPhotos] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const fetchDocumentos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .in('tipo_documento', ['Vistoria', 'Espelho de Danos'])
        .not('numero_os', 'is', null)
        .neq('numero_os', '')
        .neq('excluido_manutencao' as any, true)
        .ilike('garagem', garagemFilter)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setDocumentos(data || [])
    } catch (error) {
      console.error('Erro ao buscar documentos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocumentos()

    const channelName = `documentos_os_changes_${garagemFilter}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos',
        },
        () => {
          fetchDocumentos()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [garagemFilter])

  const filteredDocs = documentos.filter(
    (doc) =>
      doc.numero_os?.toLowerCase().includes(search.toLowerCase()) ||
      doc.numero_carro?.toLowerCase().includes(search.toLowerCase()) ||
      doc.nome_responsavel?.toLowerCase().includes(search.toLowerCase()) ||
      doc.descricao_danos?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleDownload = (url: string, e: React.MouseEvent) => {
    e.preventDefault()
    const downloadUrl = url + (url.includes('?') ? '&download=' : '?download=')
    window.open(downloadUrl, '_blank')
  }

  const handleOpenPhotoManager = (doc: any) => {
    setPhotoManagerDoc(doc)
    setStagedNewPhotos([])
    setStagedNewPhotoUrls([])
    setStagedDeletedPhotos([])
    setIsPhotoManagerOpen(true)
  }

  const handleClosePhotoManager = () => {
    if (isSavingPhotos) return
    setIsPhotoManagerOpen(false)
    setPhotoManagerDoc(null)
    setStagedNewPhotos([])
    stagedNewPhotoUrls.forEach((url) => URL.revokeObjectURL(url))
    setStagedNewPhotoUrls([])
    setStagedDeletedPhotos([])
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles = Array.from(files)
    const newUrls = newFiles.map((file) => URL.createObjectURL(file))

    setStagedNewPhotos((prev) => [...prev, ...newFiles])
    setStagedNewPhotoUrls((prev) => [...prev, ...newUrls])

    if (e.target) e.target.value = ''
  }

  const handleRemoveStagedNew = (index: number) => {
    setStagedNewPhotos((prev) => prev.filter((_, i) => i !== index))
    setStagedNewPhotoUrls((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index])
      updated.splice(index, 1)
      return updated
    })
  }

  const handleStageDeleteExisting = (url: string) => {
    setStagedDeletedPhotos((prev) => [...prev, url])
  }

  const handleSavePhotos = async () => {
    if (!photoManagerDoc) return

    setIsSavingPhotos(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id || null

      let nextSequence = 1
      if (photoManagerDoc.chamado_id) {
        const { count } = await supabase
          .from('anexos_chamado_interno')
          .select('id', { count: 'exact', head: true })
          .eq('chamado_id', photoManagerDoc.chamado_id)
          .ilike('nome_arquivo', 'Foto Conserto %')

        if (count !== null) {
          nextSequence = count + 1
        }
      } else {
        nextSequence = (photoManagerDoc.fotos_manutencao?.length || 0) + 1
      }

      const uploadedUrls: string[] = []
      const anexosInternosToInsert = []

      for (let i = 0; i < stagedNewPhotos.length; i++) {
        const file = stagedNewPhotos[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `os_foto_${photoManagerDoc.id}_${Date.now()}_${i}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(fileName, file, { upsert: false })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl(fileName)
        const publicUrl = publicUrlData.publicUrl
        uploadedUrls.push(publicUrl)

        if (photoManagerDoc.chamado_id && userId) {
          const seqStr = nextSequence.toString().padStart(2, '0')
          const numCarro = photoManagerDoc.numero_carro || 'N/A'
          const anexoName = `Foto Conserto ${seqStr} - Carro: ${numCarro}`

          anexosInternosToInsert.push({
            chamado_id: photoManagerDoc.chamado_id,
            usuario_id: userId,
            arquivo_url: publicUrl,
            nome_arquivo: anexoName,
            tamanho_bytes: file.size,
            tipo_arquivo: file.type || 'image/jpeg',
          })
          nextSequence++
        }
      }

      for (const url of stagedDeletedPhotos) {
        try {
          const pathParts = url.split('/public/documentos/')
          if (pathParts.length > 1) {
            const filePath = pathParts[1]
            await supabase.storage.from('documentos').remove([filePath])
          }
        } catch (e) {
          console.error('Failed to delete from storage', e)
        }
      }

      if (anexosInternosToInsert.length > 0) {
        const { error: insertAnexosError } = await supabase
          .from('anexos_chamado_interno')
          .insert(anexosInternosToInsert)

        if (insertAnexosError) {
          console.error('Erro ao inserir anexos internos:', insertAnexosError)
        }
      }

      const existingFotos = Array.isArray(photoManagerDoc.fotos_manutencao)
        ? photoManagerDoc.fotos_manutencao
        : []
      const keptFotos = existingFotos.filter((url: string) => !stagedDeletedPhotos.includes(url))
      const finalFotos = [...keptFotos, ...uploadedUrls]

      const { error: updateError } = await supabase
        .from('documentos')
        .update({
          fotos_manutencao: finalFotos,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', photoManagerDoc.id)

      if (updateError) throw updateError

      if (photoManagerDoc.chamado_id && userId) {
        if (uploadedUrls.length > 0) {
          const numCarro = photoManagerDoc.numero_carro || 'N/A'
          await supabase.from('historico_chamado').insert({
            chamado_id: photoManagerDoc.chamado_id,
            acao: 'respondido',
            usuario_id: userId,
            detalhes: `Evidência de manutenção (fotos) anexada ao chamado para o carro ${numCarro}.`,
          })
        } else if (stagedDeletedPhotos.length > 0) {
          await supabase.from('historico_chamado').insert({
            chamado_id: photoManagerDoc.chamado_id,
            acao: 'respondido',
            usuario_id: userId,
            detalhes: 'Evidências de manutenção removidas.',
          })
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Fotos de manutenção salvas com sucesso.',
      })

      setDocumentos((docs) =>
        docs.map((d) => (d.id === photoManagerDoc.id ? { ...d, fotos_manutencao: finalFotos } : d)),
      )

      handleClosePhotoManager()
    } catch (error: any) {
      console.error('Erro ao salvar fotos:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar fotos.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingPhotos(false)
    }
  }

  const handleRelease = async (status: string) => {
    if (!docToRelease) return
    try {
      setIsReleasing(true)
      const { error } = await supabase.rpc('liberar_veiculo_manutencao' as any, {
        p_id: docToRelease.id,
        p_status: status,
      })
      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `Veículo marcado como: ${status}`,
      })

      setDocumentos((docs) => {
        if (status === 'Liberado com Pendência') {
          return docs.map((d) =>
            d.id === docToRelease.id ? { ...d, status_liberacao: status } : d,
          )
        }
        return docs.filter((d) => d.id !== docToRelease.id)
      })
    } catch (error: any) {
      console.error('Erro ao ocultar documento:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao liberar o veículo.',
        variant: 'destructive',
      })
    } finally {
      setIsReleasing(false)
      setDocToRelease(null)
    }
  }

  const handleOpenModal = (doc: any) => {
    setSelectedDoc(doc)
    setNumeroOS(doc.numero_os || '')
    setIsModalOpen(true)
    setViewDoc(null)
  }

  const handleCloseModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    setSelectedDoc(null)
    setNumeroOS('')
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return '-'
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const handleSaveOS = async (ignoreDuplicate = false) => {
    if (!numeroOS.trim()) {
      toast({
        title: 'Atenção',
        description: 'O número da OS é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    if (!selectedDoc) return

    setIsSaving(true)
    try {
      if (!ignoreDuplicate && selectedDoc.numero_carro) {
        const { data: duplicates } = await supabase
          .from('documentos')
          .select('id')
          .eq('numero_carro', selectedDoc.numero_carro)
          .eq('excluido_manutencao', false)
          .in('tipo_documento', ['Espelho de Danos', 'Vistoria'])
          .neq('id', selectedDoc.id)

        if (duplicates && duplicates.length > 0) {
          setDuplicateSubmitAction(() => () => handleSaveOS(true))
          setDuplicateAlertOpen(true)
          setIsSaving(false)
          return
        }
      }
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('gerar-pdf', {
        body: {
          id: selectedDoc.id,
          garagem: selectedDoc.garagem,
          linha: selectedDoc.linha,
          numero_carro: selectedDoc.numero_carro,
          data: formatDate(selectedDoc.data),
          horario: selectedDoc.horario,
          ocorrencia: selectedDoc.ocorrencia,
          descricao_danos: selectedDoc.descricao_danos,
          numero_os: numeroOS.trim(),
          nome_vistoriador: selectedDoc.nome_responsavel,
          registro_vistoriador: selectedDoc.registro_responsavel,
          nome_motorista: selectedDoc.nome_motorista,
          registro_motorista: selectedDoc.registro_motorista,
          fotos: selectedDoc.fotos_urls || (selectedDoc.foto_url ? [selectedDoc.foto_url] : []),
        },
      })

      if (pdfError) throw pdfError
      if (!pdfData || !pdfData.success) throw new Error(pdfData?.error || 'Erro ao gerar PDF')

      const { url, nome_arquivo } = pdfData

      const { data: updatedDoc, error } = await supabase
        .from('documentos')
        .update({
          numero_os: numeroOS.trim(),
          arquivo_url: url,
          nome_arquivo: nome_arquivo || `Espelho_Danos_OS_${numeroOS.trim()}.pdf`,
          tipo_documento: 'Espelho de Danos',
        })
        .eq('id', selectedDoc.id)
        .select()
        .maybeSingle()

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Número da OS atualizado e PDF gerado com sucesso.',
      })

      setDocumentos((docs) =>
        docs.map((d) =>
          d.id === selectedDoc.id ? { ...d, numero_os: numeroOS.trim(), arquivo_url: url } : d,
        ),
      )

      handleCloseModal()
    } catch (error: any) {
      console.error('Erro ao salvar OS:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar o número da OS.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Listagem de Ordens de Serviço - Avarias
              </h2>
              <p className="text-slate-500 mt-1">
                Acompanhamento público das Ordens de Serviço preenchidas na vistoria.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar OS, carro, vistoriador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>

          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[120px] font-semibold">OS</TableHead>
                      <TableHead className="w-[160px] font-semibold">Data e Hora</TableHead>
                      <TableHead className="w-[120px] font-semibold">Carro</TableHead>
                      <TableHead className="w-[200px] font-semibold">Vistoriador</TableHead>
                      <TableHead className="min-w-[300px] font-semibold">Descrição</TableHead>
                      <TableHead className="w-[160px] text-right font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-5 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-9 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-8 w-24 ml-auto" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredDocs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Wrench className="h-8 w-8 text-slate-300" />
                            <p>Nenhuma OS registrada no momento</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocs.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-sm bg-white">
                              {doc.numero_os}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-slate-900 font-medium">
                                {doc.data ? format(parseISO(doc.data), 'dd/MM/yyyy') : '-'}
                              </span>
                              <span className="text-sm text-slate-500">{doc.horario || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-slate-700">
                              {doc.numero_carro || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{doc.nome_responsavel || '-'}</span>
                              {doc.registro_responsavel && (
                                <span className="text-xs text-slate-500">
                                  RE: {doc.registro_responsavel}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="whitespace-pre-wrap text-sm text-slate-600 break-words leading-relaxed py-2">
                              {doc.descricao_danos || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                                onClick={() => setViewDoc(doc)}
                                title="Visualizar documento"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                                onClick={(e) => handleDownload(doc.arquivo_url, e)}
                                title="Baixar PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <div className="relative inline-block">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                  onClick={() => handleOpenPhotoManager(doc)}
                                  title="Gerenciar Fotos de Manutenção"
                                >
                                  <Camera className="h-4 w-4" />
                                </Button>
                                {Array.isArray(doc.fotos_manutencao) &&
                                  doc.fotos_manutencao.length > 0 && (
                                    <span
                                      className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 border border-white"
                                      title={`${doc.fotos_manutencao.length} foto(s) anexada(s)`}
                                    >
                                      {doc.fotos_manutencao.length}
                                    </span>
                                  )}
                              </div>
                              {doc.status_liberacao === 'Liberado com Pendência' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center h-8 w-8 text-amber-500 bg-amber-50 rounded-md cursor-help mr-1">
                                      <AlertCircle className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Este veículo foi liberado, mas possui pendências de manutenção
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-green-600 hover:bg-green-50"
                                onClick={() => setDocToRelease(doc)}
                                title="Liberar Veículo"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handlePhotoSelect}
        />
      </main>

      {/* Modal Visualizar Detalhes */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {viewDoc?.tipo_documento === 'Vistoria'
                ? 'Detalhes da Vistoria'
                : 'Detalhes do Documento'}
            </DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#333333] font-bold mb-1">Número da OS</p>
                  <p className="text-[#333333]">{viewDoc.numero_os || '-'}</p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Garagem</p>
                  <p className="text-[#333333]">{viewDoc.garagem || '-'}</p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Linha</p>
                  <p className="text-[#333333]">{viewDoc.linha || '-'}</p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Carro</p>
                  <p className="text-[#333333]">{viewDoc.numero_carro || '-'}</p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Data / Horário</p>
                  <p className="text-[#333333]">
                    {formatDate(viewDoc.data)} {viewDoc.horario ? `às ${viewDoc.horario}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Vistoriador</p>
                  <p className="text-[#333333]">
                    {viewDoc.nome_responsavel || '-'}
                    {viewDoc.registro_responsavel ? ` (${viewDoc.registro_responsavel})` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Motorista</p>
                  <p className="text-[#333333]">
                    {viewDoc.nome_motorista || '-'}
                    {viewDoc.registro_motorista ? ` (${viewDoc.registro_motorista})` : ''}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[#333333] font-bold mb-1 text-sm">Ocorrência</p>
                <div className="text-sm text-[#333333] whitespace-pre-wrap">
                  {viewDoc.ocorrencia || '-'}
                </div>
              </div>

              <div>
                <p className="text-[#333333] font-bold mb-1 text-sm">Descrição dos Danos</p>
                <div className="text-sm text-[#333333] whitespace-pre-wrap">
                  {viewDoc.descricao_danos || '-'}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[#333333] font-bold mb-3 text-sm border-b pb-1">
                    Fotos da Vistoria
                  </p>
                  {(() => {
                    const fotosVistoria = []
                    if (viewDoc.foto_url) fotosVistoria.push(viewDoc.foto_url)
                    if (Array.isArray(viewDoc.fotos_urls)) {
                      fotosVistoria.push(...viewDoc.fotos_urls)
                    }

                    if (fotosVistoria.length === 0) {
                      return <p className="text-sm text-[#333333] italic">Nenhuma foto anexada.</p>
                    }

                    return (
                      <div className="grid grid-cols-2 gap-4">
                        {fotosVistoria.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative aspect-video bg-slate-100 rounded-md overflow-hidden border group"
                          >
                            <img
                              src={url}
                              alt={`Foto Vistoria ${idx + 1}`}
                              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                <div>
                  <p className="text-[#333333] font-bold mb-3 text-sm border-b pb-1">
                    Evidências de Manutenção
                  </p>
                  {(() => {
                    const fotosManutencao = Array.isArray(viewDoc.fotos_manutencao)
                      ? viewDoc.fotos_manutencao
                      : []

                    if (fotosManutencao.length === 0) {
                      return <p className="text-sm text-[#333333] italic">Nenhuma foto anexada.</p>
                    }

                    return (
                      <div className="grid grid-cols-2 gap-4">
                        {fotosManutencao.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative aspect-video bg-slate-100 rounded-md overflow-hidden border group"
                          >
                            <img
                              src={url}
                              alt={`Evidência Manutenção ${idx + 1}`}
                              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-end gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setViewDoc(null)}
              className="bg-white border-[#333333] text-[#333333] hover:bg-slate-50"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Preencher OS */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Preencher Número da OS</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="os">
                Número da OS <span className="text-red-500">*</span>
              </Label>
              <Input
                id="os"
                value={numeroOS}
                onChange={(e) => setNumeroOS(e.target.value)}
                placeholder="Ex: 12345"
                type="number"
                disabled={isSaving}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveOS(false)
                  }
                }}
              />
            </div>
            {selectedDoc && (
              <div className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-md border mt-2 space-y-1">
                <p>
                  <strong>Garagem:</strong> {selectedDoc.garagem || '-'}
                </p>
                <p>
                  <strong>Linha:</strong> {selectedDoc.linha || '-'}
                </p>
                <p>
                  <strong>Carro:</strong> {selectedDoc.numero_carro || '-'}
                </p>
                <p>
                  <strong>Data:</strong> {formatDate(selectedDoc.data)}
                </p>
                <p className="line-clamp-2" title={selectedDoc.descricao_danos || ''}>
                  <strong>Danos:</strong> {truncateText(selectedDoc.descricao_danos, 80)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleSaveOS(false)}
              disabled={isSaving}
              className="bg-[#1A522E] hover:bg-[#154224] text-white"
            >
              {isSaving ? 'Salvando...' : 'Salvar e Concluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateAlertOpen} onOpenChange={setDuplicateAlertOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Atenção</DialogTitle>
            <DialogDescription>
              Já existe um espelho de danos para esse carro, por favor verificar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateAlertOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                setDuplicateAlertOpen(false)
                if (duplicateSubmitAction) duplicateSubmitAction()
                setDuplicateSubmitAction(null)
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Prosseguir mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!docToRelease}
        onOpenChange={(open) => !open && !isReleasing && setDocToRelease(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Liberar Veículo</DialogTitle>
            <DialogDescription className="text-slate-500 mt-2">
              Esta ação irá remover a Ordem de Serviço da lista de manutenção. Selecione a condição
              de liberação:
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => handleRelease('Liberado (Sem Pendências)')}
              disabled={isReleasing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-base"
            >
              {isReleasing ? 'Processando...' : 'Liberado (Sem Pendências)'}
            </Button>
            <Button
              onClick={() => handleRelease('Liberado com Pendência')}
              disabled={isReleasing}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-6 text-base"
            >
              {isReleasing ? 'Processando...' : 'Liberado com Pendência'}
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDocToRelease(null)}
              disabled={isReleasing}
              className="w-full"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPhotoManagerOpen} onOpenChange={(open) => !open && handleClosePhotoManager()}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar Fotos de Manutenção</DialogTitle>
            <DialogDescription>
              Adicione ou remova fotos de evidência de manutenção para esta OS. Clique em "Salvar"
              para confirmar as alterações.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-md border">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  OS: {photoManagerDoc?.numero_os || '-'}
                </p>
                <p className="text-xs text-slate-500">
                  Carro: {photoManagerDoc?.numero_carro || '-'}
                </p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()} disabled={isSavingPhotos}>
                <Camera className="mr-2 h-4 w-4" /> Adicionar Fotos
              </Button>
            </div>

            {(() => {
              const existingFotos = Array.isArray(photoManagerDoc?.fotos_manutencao)
                ? photoManagerDoc.fotos_manutencao
                : []
              const activeExistingFotos = existingFotos.filter(
                (url: string) => !stagedDeletedPhotos.includes(url),
              )

              if (activeExistingFotos.length === 0 && stagedNewPhotoUrls.length === 0) {
                return (
                  <div className="text-center py-12 text-slate-500 bg-slate-50/50 rounded-lg border border-dashed">
                    <Camera className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p>Nenhuma foto de manutenção para exibir.</p>
                  </div>
                )
              }

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {activeExistingFotos.map((url: string, idx: number) => (
                    <div
                      key={`existing-${idx}`}
                      className="relative group aspect-square rounded-md overflow-hidden bg-slate-100 border"
                    >
                      <img
                        src={url}
                        alt={`Evidência Existente ${idx + 1}`}
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute top-2 right-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStageDeleteExisting(url)
                          }}
                          disabled={isSavingPhotos}
                          title="Remover foto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {stagedNewPhotoUrls.map((url: string, idx: number) => (
                    <div
                      key={`new-${idx}`}
                      className="relative group aspect-square rounded-md overflow-hidden bg-blue-50 border-2 border-blue-200 border-dashed"
                    >
                      <img
                        src={url}
                        alt={`Nova Evidência ${idx + 1}`}
                        className="object-cover w-full h-full opacity-90"
                      />
                      <div className="absolute top-2 right-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveStagedNew(idx)
                          }}
                          disabled={isSavingPhotos}
                          title="Descartar nova foto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                        Nova
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          <DialogFooter className="mt-4 pt-4 border-t gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClosePhotoManager} disabled={isSavingPhotos}>
              Cancelar
            </Button>
            <Button
              onClick={handleSavePhotos}
              disabled={isSavingPhotos}
              className="bg-primary text-primary-foreground"
            >
              {isSavingPhotos ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
