import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { FileText, Image as ImageIcon, Upload, Paperclip, Loader2, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SecretariaTecnica() {
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Modal States
  const [photosModalOpen, setPhotosModalOpen] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [viewDoc, setViewDoc] = useState<any>(null)

  const fetchDocumentos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('documentos')
        .select(`
          *,
          chamados (
            id, 
            titulo,
            pia,
            registro_motorista, 
            nome_motorista, 
            responsavel_id,
            tipo_chamado
          ),
          formularios_espelho_danos(*)
        `)
        .in('tipo_documento', ['Vistoria', 'Espelho de Danos'])
        .not('numero_os', 'is', null)
        .neq('numero_os', '')
        .order('criado_em', { ascending: false })

      if (error) throw error

      // Filter: must have maintenance photos (fotos_manutencao not empty)
      const withPhotos =
        data?.filter((doc: any) => {
          return Array.isArray(doc.fotos_manutencao) && doc.fotos_manutencao.length > 0
        }) || []

      setDocumentos(withPhotos)
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Erro ao carregar documentos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocumentos()

    // Real-time updates
    const channel = supabase
      .channel('secretaria_documentos_changes')
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
  }, [])

  const handleOpenPhotos = (doc: any) => {
    const photos: string[] = []
    if (Array.isArray(doc.fotos_manutencao)) {
      doc.fotos_manutencao.forEach((url: string) => {
        if (url && !photos.includes(url)) photos.push(url)
      })
    }
    setSelectedPhotos(photos)
    setPhotosModalOpen(true)
  }

  const handleUploadClick = (doc: any) => {
    setSelectedDoc(doc)
    setFile(null)
    setUploadModalOpen(true)
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !selectedDoc) return

    try {
      setUploading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado.')

      let chamadoId = selectedDoc.chamado_id
      let ticketData = null

      if (chamadoId) {
        const { data } = await supabase
          .from('chamados')
          .select('id, numero_os, carro, pia')
          .eq('id', chamadoId)
          .maybeSingle()
        ticketData = data
      } else if (selectedDoc.numero_os) {
        const { data } = await supabase
          .from('chamados')
          .select('id, numero_os, carro, pia')
          .eq('numero_os', selectedDoc.numero_os)
          .limit(1)
          .maybeSingle()
        if (data) {
          ticketData = data
          chamadoId = data.id
        }
      }

      const osNumber = ticketData?.numero_os || selectedDoc.numero_os || 'N/A'
      const carNumber = ticketData?.carro || selectedDoc.numero_carro || 'N/A'

      const fileExt = file.name.split('.').pop()
      const storageFileName = `orcamento_${selectedDoc.id}_${Date.now()}.${fileExt}`
      const filePath = `orcamentos/${storageFileName}`

      const displayFileName = `Orçamento - OS: ${osNumber} - Carro: ${carNumber}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('anexos_chamados_interno')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('anexos_chamados_interno')
        .getPublicUrl(filePath)

      const orcamento_url = publicUrlData.publicUrl

      const docUpdateData: any = { orcamento_url }
      if (chamadoId && !selectedDoc.chamado_id) {
        docUpdateData.chamado_id = chamadoId
      }

      const { error: updateError } = await supabase
        .from('documentos')
        .update(docUpdateData)
        .eq('id', selectedDoc.id)

      if (updateError) throw updateError

      if (chamadoId) {
        const { error: anexoError } = await supabase.from('anexos_chamado_interno').insert({
          chamado_id: chamadoId,
          usuario_id: user.id,
          nome_arquivo: displayFileName,
          arquivo_url: orcamento_url,
          tipo_arquivo: file.type || 'application/octet-stream',
          tamanho_bytes: file.size,
        })

        if (anexoError) throw anexoError

        const { error: histError } = await supabase.from('historico_chamado').insert({
          chamado_id: chamadoId,
          usuario_id: user.id,
          acao: 'respondido',
          detalhes: 'Orçamento anexado pela Secretaria Técnica',
        })

        if (histError) throw histError
      }

      toast({ title: 'Sucesso', description: 'Orçamento anexado e vinculado com sucesso!' })
      setUploadModalOpen(false)
      fetchDocumentos()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao anexar orçamento.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between items-start gap-2">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Secretária Técnica</h1>
        <p className="text-slate-500">Análise de orçamentos e OS de Manutenção com evidências.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RA</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Carro</TableHead>
                <TableHead>Garagem</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Carregando registros...
                  </TableCell>
                </TableRow>
              ) : documentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhum registro com evidências fotográficas encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                documentos.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium text-slate-700">
                      {doc.registro_responsavel || '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">
                      {doc.numero_os || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-slate-50">
                        {doc.numero_carro || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{doc.garagem || '-'}</TableCell>
                    <TableCell>
                      {doc.data
                        ? format(new Date(doc.data + 'T12:00:00'), 'dd/MM/yyyy')
                        : format(new Date(doc.criado_em), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div
                        className="line-clamp-2 text-sm text-slate-600 max-w-xs"
                        title={doc.descricao_danos}
                      >
                        {doc.descricao_danos || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewDoc(doc)}
                          title="Ver Espelho/OS"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPhotos(doc)}
                          title="Ver Fotos da OS"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                        {doc.orcamento_url ? (
                          <>
                            <Button variant="outline" size="sm" asChild title="Ver Orçamento">
                              <a
                                href={doc.orcamento_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleUploadClick(doc)}
                              title="Atualizar Orçamento"
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUploadClick(doc)}
                            title="Anexar Orçamento"
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={photosModalOpen} onOpenChange={setPhotosModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Evidências Fotográficas</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 max-h-[70vh] overflow-y-auto p-1">
            {selectedPhotos.length === 0 ? (
              <p className="text-slate-500">Nenhuma foto disponível.</p>
            ) : (
              selectedPhotos.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block relative aspect-video bg-slate-100 rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all"
                >
                  <img
                    src={url}
                    alt={`Evidência ${i + 1}`}
                    className="object-cover w-full h-full"
                  />
                </a>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={uploadModalOpen}
        onOpenChange={(open) => !uploading && setUploadModalOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexar Orçamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Arquivo (PDF ou Imagem)</Label>
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={uploading}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadModalOpen(false)}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!file || uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Paperclip className="w-4 h-4 mr-2" />
                    Anexar Orçamento
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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
    </div>
  )
}
