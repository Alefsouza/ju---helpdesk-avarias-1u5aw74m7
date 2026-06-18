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
import {
  FileText,
  Image as ImageIcon,
  Upload,
  Paperclip,
  Loader2,
  Eye,
  AlertCircle,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function SecretariaTecnica() {
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Modal States
  const [photosModalOpen, setPhotosModalOpen] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<{ url: string; type: 'photo' | 'pdf' }[]>([])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [numeroOrcamento, setNumeroOrcamento] = useState('')
  const [valorOrcamento, setValorOrcamento] = useState('')
  const [detalhesOrcamento, setDetalhesOrcamento] = useState('')
  const [viewDoc, setViewDoc] = useState<any>(null)

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value) {
      value = (parseInt(value, 10) / 100).toFixed(2)
      value = value.replace('.', ',')
      value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
      setValorOrcamento('R$ ' + value)
    } else {
      setValorOrcamento('')
    }
  }

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
            tipo_chamado,
            carro,
            status,
            numero_os
          ),
          formularios_espelho_danos(*)
        `)
        .in('tipo_documento', ['Vistoria', 'Espelho de Danos'])
        .not('numero_os', 'is', null)
        .neq('numero_os', '')
        .order('criado_em', { ascending: false })

      if (error) throw error

      // Filter: must have maintenance photos AND (NO orcamento_url OR is_recusado)
      const pendingDocuments =
        data?.filter((doc: any) => {
          const hasPhotos = Array.isArray(doc.fotos_manutencao) && doc.fotos_manutencao.length > 0
          const hasOrcamento = !!doc.orcamento_url
          return hasPhotos && (!hasOrcamento || doc.is_recusado)
        }) || []

      // Identify which OS numbers need a fresh lookup
      const osToFetch = pendingDocuments
        .filter((doc) => {
          const cStatus = doc.chamados?.status?.toLowerCase() || ''
          const isExcluded =
            doc.chamados && ['finalizado', 'operacao', 'unificado'].includes(cStatus)
          const docOs = (doc.numero_os || doc.chamados?.numero_os)?.trim()
          return (!doc.chamados || isExcluded) && !!docOs
        })
        .map((doc) => (doc.numero_os || doc.chamados?.numero_os)?.trim())
        .filter(Boolean)

      if (osToFetch.length > 0) {
        const uniqueOsToFetch = [...new Set(osToFetch)]
        const { data: chamadosByOs } = await supabase
          .from('chamados')
          .select('id, numero_os, pia, status, criado_em')
          .in('numero_os', uniqueOsToFetch)
          .order('criado_em', { ascending: false })

        pendingDocuments.forEach((doc) => {
          const cStatus = doc.chamados?.status?.toLowerCase() || ''
          const isExcluded =
            doc.chamados && ['finalizado', 'operacao', 'unificado'].includes(cStatus)
          const docOs = (doc.numero_os || doc.chamados?.numero_os)?.trim()
          const needsLookup = (!doc.chamados || isExcluded) && !!docOs

          if (needsLookup) {
            const matchedChamados = (chamadosByOs || []).filter((c) => {
              const matchedCStatus = c.status?.toLowerCase() || ''
              return (
                c.numero_os?.trim() === docOs &&
                !['finalizado', 'operacao', 'unificado'].includes(matchedCStatus)
              )
            })

            if (matchedChamados.length > 0) {
              const emAtendimento = matchedChamados.find(
                (c) => c.status?.toLowerCase() === 'em_atendimento',
              )
              const selectedChamado = emAtendimento || matchedChamados[0]

              doc.chamados = {
                ...doc.chamados,
                pia: selectedChamado.pia,
                id: selectedChamado.id,
                status: selectedChamado.status,
                numero_os: selectedChamado.numero_os,
              }
            } else if (doc.chamados && isExcluded) {
              doc.chamados.pia = null
            }
          } else if (doc.chamados && isExcluded) {
            doc.chamados.pia = null
          }
        })
      } else {
        pendingDocuments.forEach((doc) => {
          const cStatus = doc.chamados?.status?.toLowerCase() || ''
          const isExcluded =
            doc.chamados && ['finalizado', 'operacao', 'unificado'].includes(cStatus)
          if (doc.chamados && isExcluded) {
            doc.chamados.pia = null
          }
        })
      }

      setDocumentos(pendingDocuments)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chamados',
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
    const photos: { url: string; type: 'manutencao' | 'requisicao' | 'orcamento' | 'pdf' }[] = []

    if (Array.isArray(doc.fotos_manutencao)) {
      doc.fotos_manutencao.forEach((url: string) => {
        if (url && !photos.some((p) => p.url === url)) {
          photos.push({ url, type: 'manutencao' })
        }
      })
    }

    if (Array.isArray(doc.fotos_requisicao)) {
      doc.fotos_requisicao.forEach((url: string) => {
        if (url && !photos.some((p) => p.url === url)) {
          const isPdf = url.toLowerCase().split('?')[0].endsWith('.pdf')
          photos.push({ url, type: isPdf ? 'pdf' : 'requisicao' })
        }
      })
    }

    if (doc.orcamento_url) {
      if (!photos.some((p) => p.url === doc.orcamento_url)) {
        const isPdf = doc.orcamento_url.toLowerCase().split('?')[0].endsWith('.pdf')
        photos.push({ url: doc.orcamento_url, type: isPdf ? 'pdf' : 'orcamento' })
      }
    }

    setSelectedPhotos(photos)
    setPhotosModalOpen(true)
  }

  const handleUploadClick = (doc: any) => {
    setSelectedDoc(doc)
    setFile(null)
    setNumeroOrcamento('')
    setValorOrcamento('')
    setDetalhesOrcamento('')
    setUploadModalOpen(true)
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !selectedDoc || !numeroOrcamento || !valorOrcamento) return

    try {
      setUploading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado.')

      // Use the resolved active ticket ID if available, fallback to the original DB field
      let chamadoId = selectedDoc.chamados?.id || selectedDoc.chamado_id
      let ticketData = null

      if (chamadoId) {
        const { data } = await supabase
          .from('chamados')
          .select('id, numero_os, carro, pia')
          .eq('id', chamadoId)
          .maybeSingle()
        ticketData = data
      } else if (selectedDoc.numero_os || selectedDoc.chamados?.numero_os) {
        const docOs = (selectedDoc.numero_os || selectedDoc.chamados?.numero_os)?.trim() || ''
        const { data } = await supabase
          .from('chamados')
          .select('id, numero_os, carro, pia, status')
          .eq('numero_os', docOs)
          .not('status', 'in', '("finalizado","operacao","unificado")')
          .order('criado_em', { ascending: false })

        if (data && data.length > 0) {
          const emAtendimento = data.find((c) => c.status?.toLowerCase() === 'em_atendimento')
          ticketData = emAtendimento || data[0]
          chamadoId = ticketData.id
        }
      }

      const osNumber =
        ticketData?.numero_os || selectedDoc.numero_os || selectedDoc.chamados?.numero_os || 'N/A'
      const carNumber =
        ticketData?.carro || selectedDoc.chamados?.carro || selectedDoc.numero_carro || 'N/A'

      const fileExt = file.name.split('.').pop()
      const storageFileName = `orcamento_${selectedDoc.id}_${Date.now()}.${fileExt}`
      const filePath = `orcamentos/${storageFileName}`

      const displayFileName = `Orçamento: ${numeroOrcamento} - OS: ${osNumber} - Carro: ${carNumber}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('anexos_chamados_interno')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('anexos_chamados_interno')
        .getPublicUrl(filePath)

      const orcamento_url = publicUrlData.publicUrl

      const parsedValor = parseFloat(
        valorOrcamento.replace('R$ ', '').replace(/\./g, '').replace(',', '.'),
      )
      const docUpdateData: any = {
        orcamento_url,
        valor_orcamento: parsedValor,
        is_recusado: false,
        motivo_recusa: null,
      }
      if (chamadoId && selectedDoc.chamado_id !== chamadoId) {
        // Automatically link the document to the active ticket if it wasn't already
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
          detalhes: detalhesOrcamento || 'Orçamento anexado.',
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
                    Nenhum registro com evidências ou orçamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                documentos.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium text-slate-700">
                      {doc.chamados?.pia || '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">
                      {doc.numero_os || doc.chamados?.numero_os || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono bg-slate-50">
                          {doc.numero_carro || '-'}
                        </Badge>
                        {doc.is_recusado && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-4 w-4 text-red-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[250px] bg-red-50 border-red-200 text-red-900">
                                <p className="font-bold text-xs mb-1">Orçamento Devolvido</p>
                                <p className="text-xs">{doc.motivo_recusa}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
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
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUploadClick(doc)}
                          title={doc.orcamento_url ? 'Atualizar Orçamento' : 'Anexar Orçamento'}
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
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
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Evidências e Documentos</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-1 space-y-8">
            {selectedPhotos.length === 0 ? (
              <p className="text-slate-500">Nenhuma evidência disponível.</p>
            ) : (
              <>
                {selectedPhotos.some((p) => p.type === 'manutencao') && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase border-b pb-1">
                      Fotos da Manutenção
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {selectedPhotos
                        .filter((p) => p.type === 'manutencao')
                        .map((item, i) => (
                          <a
                            key={i}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative aspect-video bg-slate-100 rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all flex items-center justify-center"
                          >
                            <img
                              src={item.url}
                              alt={`Evidência Manutenção ${i + 1}`}
                              className="object-cover w-full h-full"
                            />
                          </a>
                        ))}
                    </div>
                  </div>
                )}

                {selectedPhotos.some(
                  (p) =>
                    p.type === 'requisicao' || (p.type === 'pdf' && !p.url.includes('orcamento')),
                ) && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase border-b pb-1 mt-4">
                      Requisições
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {selectedPhotos
                        .filter(
                          (p) =>
                            p.type === 'requisicao' ||
                            (p.type === 'pdf' && !p.url.includes('orcamento')),
                        )
                        .map((item, i) => (
                          <a
                            key={i}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative aspect-video bg-slate-100 rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all flex items-center justify-center"
                          >
                            {item.type === 'pdf' ? (
                              <div className="flex flex-col items-center justify-center p-4">
                                <FileText className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-sm font-medium text-slate-600 text-center">
                                  PDF
                                </span>
                              </div>
                            ) : (
                              <img
                                src={item.url}
                                alt={`Requisição ${i + 1}`}
                                className="object-cover w-full h-full"
                              />
                            )}
                          </a>
                        ))}
                    </div>
                  </div>
                )}

                {selectedPhotos.some(
                  (p) =>
                    p.type === 'orcamento' || (p.type === 'pdf' && p.url.includes('orcamento')),
                ) && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase border-b pb-1 mt-4">
                      Orçamento
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {selectedPhotos
                        .filter(
                          (p) =>
                            p.type === 'orcamento' ||
                            (p.type === 'pdf' && p.url.includes('orcamento')),
                        )
                        .map((item, i) => (
                          <a
                            key={i}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative aspect-video bg-purple-50 rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all flex items-center justify-center"
                          >
                            {item.type === 'pdf' ? (
                              <div className="flex flex-col items-center justify-center p-4">
                                <FileText className="w-8 h-8 text-purple-400 mb-2" />
                                <span className="text-sm font-medium text-purple-600 text-center">
                                  Orçamento PDF
                                </span>
                              </div>
                            ) : (
                              <img
                                src={item.url}
                                alt={`Orçamento ${i + 1}`}
                                className="object-cover w-full h-full"
                              />
                            )}
                          </a>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setPhotosModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
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
              <Label>Número do Orçamento</Label>
              <Input
                value={numeroOrcamento}
                onChange={(e) => setNumeroOrcamento(e.target.value)}
                placeholder="Ex: ORC-12345"
                disabled={uploading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Valor do Orçamento</Label>
              <Input
                value={valorOrcamento}
                onChange={handleValorChange}
                placeholder="R$ 0,00"
                disabled={uploading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Detalhes do Orçamento (Opcional)</Label>
              <Textarea
                value={detalhesOrcamento}
                onChange={(e) => setDetalhesOrcamento(e.target.value)}
                placeholder="Descreva os detalhes..."
                disabled={uploading}
              />
            </div>
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
            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadModalOpen(false)}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!file || !numeroOrcamento || !valorOrcamento || uploading}
              >
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
                  <p className="text-[#333333] font-bold mb-1">RA</p>
                  <p className="text-[#333333]">{viewDoc.chamados?.pia || '-'}</p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Número da OS</p>
                  <p className="text-[#333333]">
                    {viewDoc.numero_os || viewDoc.chamados?.numero_os || '-'}
                  </p>
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
                            {url.toLowerCase().endsWith('.pdf') ? (
                              <div className="flex items-center justify-center w-full h-full bg-slate-200">
                                <span className="text-xs font-bold text-slate-500">PDF</span>
                              </div>
                            ) : (
                              <img
                                src={url}
                                alt={`Evidência Manutenção ${idx + 1}`}
                                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {Array.isArray(viewDoc.fotos_requisicao) && viewDoc.fotos_requisicao.length > 0 && (
                  <div>
                    <p className="text-[#333333] font-bold mb-3 text-sm border-b pb-1 mt-4">
                      Requisições Anexadas
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {viewDoc.fotos_requisicao.map((url: string, idx: number) => (
                        <a
                          key={`req-${idx}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block relative aspect-video bg-slate-100 rounded-md overflow-hidden border group"
                        >
                          {url.toLowerCase().endsWith('.pdf') ? (
                            <div className="flex items-center justify-center w-full h-full bg-slate-200">
                              <span className="text-xs font-bold text-slate-500">PDF</span>
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt={`Requisição ${idx + 1}`}
                              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
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
