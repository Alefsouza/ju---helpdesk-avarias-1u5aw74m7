import { useEffect, useState } from 'react'
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
import { Eye, Download, Search, Wrench, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function OsManutencao() {
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [docToDelete, setDocToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewDoc, setViewDoc] = useState<any>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [numeroOS, setNumeroOS] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchDocumentos()

    const channel = supabase
      .channel('documentos_os_changes')
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
        .order('criado_em', { ascending: false })

      if (error) throw error
      setDocumentos(data || [])
    } catch (error) {
      console.error('Erro ao buscar documentos:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleDelete = async () => {
    if (!docToDelete) return
    try {
      setIsDeleting(true)
      const { error } = await supabase.rpc('ocultar_documento_manutencao' as any, {
        p_id: docToDelete.id,
      })
      if (error) throw error

      setDocumentos((docs) => docs.filter((d) => d.id !== docToDelete.id))
    } catch (error) {
      console.error('Erro ao ocultar documento:', error)
    } finally {
      setIsDeleting(false)
      setDocToDelete(null)
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

  const handleSaveOS = async () => {
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
              <h1 className="text-xl font-bold text-white">OS - Manutenção</h1>
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setDocToDelete(doc)}
                                title="Excluir da listagem"
                              >
                                <Trash2 className="h-4 w-4" />
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

              <div>
                <p className="text-[#333333] font-bold mb-3 text-sm">Fotos Anexadas</p>
                {(() => {
                  const fotos = []
                  if (viewDoc.foto_url) fotos.push(viewDoc.foto_url)
                  if (Array.isArray(viewDoc.fotos_urls)) {
                    fotos.push(...viewDoc.fotos_urls)
                  }

                  if (fotos.length === 0) {
                    return (
                      <p className="text-sm text-[#333333] italic">
                        Nenhuma foto foi anexada nesta vistoria.
                      </p>
                    )
                  }

                  return (
                    <div className="grid grid-cols-2 gap-4">
                      {fotos.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block relative aspect-video bg-slate-100 rounded-md overflow-hidden border group"
                        >
                          <img
                            src={url}
                            alt={`Foto ${idx + 1}`}
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
          )}
          <DialogFooter className="flex justify-end gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setViewDoc(null)}
              className="bg-white border-[#333333] text-[#333333] hover:bg-slate-50"
            >
              Fechar
            </Button>
            {viewDoc && (
              <Button
                onClick={() => {
                  handleOpenModal(viewDoc)
                }}
                className="bg-[#1A522E] hover:bg-[#154224] text-white"
              >
                Preencher OS
              </Button>
            )}
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
                    handleSaveOS()
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
              onClick={handleSaveOS}
              disabled={isSaving}
              className="bg-[#1A522E] hover:bg-[#154224] text-white"
            >
              {isSaving ? 'Salvando...' : 'Salvar e Concluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!docToDelete}
        onOpenChange={(open) => !open && !isDeleting && setDocToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir da listagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá ocultar a Ordem de Serviço da lista de manutenção. O documento original
              será mantido no sistema e poderá ser acessado normalmente pelo dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
