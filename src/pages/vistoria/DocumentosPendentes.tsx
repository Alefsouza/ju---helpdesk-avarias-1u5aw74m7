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
import { FileEdit } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

type Documento = {
  id: string
  garagem: string | null
  linha: string | null
  data: string | null
  descricao_danos: string | null
  criado_em: string
}

export default function DocumentosPendentes() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)
  const [numeroOS, setNumeroOS] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const fetchDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('id, garagem, linha, data, descricao_danos, criado_em')
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
      const { error } = await supabase
        .from('documentos')
        .update({ numero_os: numeroOS.trim() })
        .eq('id', selectedDoc.id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Número da OS salvo com sucesso. Documento concluído.',
      })

      // Update local state to remove immediately for better UX
      setDocumentos((docs) => docs.filter((d) => d.id !== selectedDoc.id))
      handleCloseModal()
    } catch (error) {
      console.error('Erro ao salvar OS:', error)
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o número da OS.',
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
              <TableHead className="text-right w-[150px]">Ações</TableHead>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenModal(doc)}
                      className="text-[#225f3d] hover:text-[#1a4a2f] hover:bg-[#c8e6c9]/20 border-[#225f3d]/20"
                    >
                      <FileEdit className="mr-2 h-4 w-4" />
                      Preencher OS
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
    </div>
  )
}
