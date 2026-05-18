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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { FileEdit, Eye } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

type Documento = {
  id: string
  garagem: string | null
  linha: string | null
  data: string | null
  horario: string | null
  ocorrencia: string | null
  descricao_danos: string | null
  foto_url: string | null
  fotos_urls: string[] | null
  nome_responsavel: string | null
  registro_responsavel: string | null
  nome_motorista: string | null
  registro_motorista: string | null
  criado_em: string
}

export default function DocumentosPendentes() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)
  const [selectedViewDoc, setSelectedViewDoc] = useState<Documento | null>(null)
  const [numeroOS, setNumeroOS] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const fetchDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select(
          'id, garagem, linha, data, horario, ocorrencia, descricao_danos, foto_url, fotos_urls, nome_responsavel, registro_responsavel, nome_motorista, registro_motorista, criado_em',
        )
        .eq('tipo_documento', 'Vistoria')
        .is('numero_os', null)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setDocumentos(data || [])
    } catch (error) {
      console.error('Erro ao buscar documentos:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os documentos pendentes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocumentos()

    const channel = supabase
      .channel('documentos_pendentes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documentos', filter: `tipo_documento=eq.Vistoria` },
        () => {
          fetchDocumentos()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleOpenModal = (doc: Documento) => {
    setSelectedDoc(doc)
    setNumeroOS('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    setSelectedDoc(null)
    setNumeroOS('')
  }

  const handleOpenViewModal = (doc: Documento) => {
    setSelectedViewDoc(doc)
    setIsViewModalOpen(true)
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
      // 1. Gerar PDF via Edge Function
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('gerar-pdf', {
        body: {
          id: selectedDoc.id,
          garagem: selectedDoc.garagem,
          linha: selectedDoc.linha,
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

      // 2. Atualizar documento com número da OS e URL do PDF gerado
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
        .single()

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Número da OS salvo e PDF gerado com sucesso. Documento concluído.',
      })

      setDocumentos((docs) => docs.filter((d) => d.id !== selectedDoc.id))
      handleCloseModal()

      // 3. Criar chamado automaticamente em background (não bloqueia o usuário)
      supabase.functions
        .invoke('criar-chamado-vistoria', {
          body: { documento: updatedDoc },
        })
        .then(({ error: functionError }) => {
          if (functionError) {
            console.error(
              'Erro retornado pela Edge Function criar-chamado-vistoria:',
              functionError,
            )
          }
        })
        .catch((err) => {
          console.error('Erro ao chamar Edge Function criar-chamado-vistoria:', err)
        })
    } catch (error: any) {
      console.error('Erro ao salvar OS:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar o número da OS e gerar o PDF.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return '-'
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Documentos Pendentes</h1>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Garagem</TableHead>
              <TableHead>Linha</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição dos Danos</TableHead>
              <TableHead className="text-right w-[280px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24">
                  <div className="flex justify-center items-center h-full">
                    <Skeleton className="w-full max-w-[200px] h-8" />
                  </div>
                </TableCell>
              </TableRow>
            ) : documentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  Nenhum documento de Vistoria pendente de OS encontrado no momento.
                </TableCell>
              </TableRow>
            ) : (
              documentos.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.garagem || '-'}</TableCell>
                  <TableCell>{doc.linha || '-'}</TableCell>
                  <TableCell>{formatDate(doc.data)}</TableCell>
                  <TableCell className="max-w-[300px] truncate" title={doc.descricao_danos || ''}>
                    {truncateText(doc.descricao_danos)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenViewModal(doc)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenModal(doc)}
                        className="text-[#225f3d] hover:text-[#1a4a2f] hover:bg-[#c8e6c9]/20 border-[#225f3d]/20"
                      >
                        <FileEdit className="mr-2 h-4 w-4" />
                        Preencher OS
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
              className="bg-[#225f3d] hover:bg-[#1a4a2f] text-white"
            >
              {isSaving ? 'Salvando...' : 'Salvar e Concluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar Detalhes */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Vistoria</DialogTitle>
          </DialogHeader>
          {selectedViewDoc && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 font-medium mb-1">Garagem</p>
                  <p className="text-slate-900">{selectedViewDoc.garagem || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium mb-1">Linha</p>
                  <p className="text-slate-900">{selectedViewDoc.linha || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium mb-1">Data / Horário</p>
                  <p className="text-slate-900">
                    {formatDate(selectedViewDoc.data)}{' '}
                    {selectedViewDoc.horario ? `às ${selectedViewDoc.horario}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium mb-1">Vistoriador</p>
                  <p className="text-slate-900">
                    {selectedViewDoc.nome_responsavel || '-'}
                    {selectedViewDoc.registro_responsavel
                      ? ` (${selectedViewDoc.registro_responsavel})`
                      : ''}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-slate-500 font-medium mb-1 text-sm">Ocorrência</p>
                <div className="bg-slate-50 p-3 rounded-md border text-sm text-slate-900 whitespace-pre-wrap">
                  {selectedViewDoc.ocorrencia || '-'}
                </div>
              </div>

              <div>
                <p className="text-slate-500 font-medium mb-1 text-sm">Descrição dos Danos</p>
                <div className="bg-slate-50 p-3 rounded-md border text-sm text-slate-900 whitespace-pre-wrap">
                  {selectedViewDoc.descricao_danos || '-'}
                </div>
              </div>

              <div>
                <p className="text-slate-500 font-medium mb-3 text-sm">Fotos Anexadas</p>
                {(() => {
                  const fotos = []
                  if (selectedViewDoc.foto_url) fotos.push(selectedViewDoc.foto_url)
                  if (Array.isArray(selectedViewDoc.fotos_urls)) {
                    fotos.push(...selectedViewDoc.fotos_urls)
                  }

                  if (fotos.length === 0) {
                    return (
                      <p className="text-sm text-slate-500 italic">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
            {selectedViewDoc && (
              <Button
                onClick={() => {
                  setIsViewModalOpen(false)
                  handleOpenModal(selectedViewDoc)
                }}
                className="bg-[#225f3d] hover:bg-[#1a4a2f] text-white"
              >
                Preencher OS
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
