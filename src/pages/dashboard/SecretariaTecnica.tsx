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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const fetchDocumentos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .in('tipo_documento', ['Vistoria', 'Espelho de Danos', 'OS de Manutenção'])
        .not('fotos_urls', 'is', null)
        .order('criado_em', { ascending: false })

      if (error) throw error

      // Filter: must have photos (fotos_urls is NOT NULL and NOT EMPTY)
      const withPhotos =
        data?.filter((doc: any) => {
          return Array.isArray(doc.fotos_urls) && doc.fotos_urls.length > 0
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
  }, [])

  const handleOpenPhotos = (doc: any) => {
    const photos: string[] = []
    if (doc.foto_url) photos.push(doc.foto_url)
    if (Array.isArray(doc.fotos_urls)) {
      doc.fotos_urls.forEach((url: string) => {
        if (url && !photos.includes(url)) photos.push(url)
      })
    }
    setSelectedPhotos(photos)
    setPhotosModalOpen(true)
  }

  const handleUploadClick = (docId: string) => {
    setSelectedDocId(docId)
    setFile(null)
    setUploadModalOpen(true)
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !selectedDocId) return

    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `orcamento_${selectedDocId}_${Date.now()}.${fileExt}`
      const filePath = `orcamentos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('anexos_chamados_interno')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('anexos_chamados_interno')
        .getPublicUrl(filePath)

      const orcamento_url = publicUrlData.publicUrl

      const { error: updateError } = await supabase
        .from('documentos')
        .update({ orcamento_url })
        .eq('id', selectedDocId)

      if (updateError) throw updateError

      toast({ title: 'Sucesso', description: 'Orçamento anexado com sucesso.' })
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
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Orçamento</TableHead>
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
                    <TableCell className="font-medium text-slate-600">
                      {doc.numero_os || '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">
                      {doc.numero_os || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-slate-50">
                        {doc.numero_carro || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.data
                        ? format(new Date(doc.data + 'T12:00:00'), 'dd/MM/yyyy')
                        : format(new Date(doc.criado_em), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div
                        className="max-w-[250px] truncate"
                        title={doc.ocorrencia || doc.descricao_danos || ''}
                      >
                        {doc.ocorrencia || doc.descricao_danos || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.orcamento_url ? (
                        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                          Anexado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {doc.arquivo_url && (
                        <Button variant="outline" size="sm" asChild title="Ver Espelho/OS">
                          <a href={doc.arquivo_url} target="_blank" rel="noreferrer">
                            <FileText className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPhotos(doc)}
                        title="Ver Fotos"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                      {doc.orcamento_url ? (
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
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUploadClick(doc.id)}
                          title="Anexar Orçamento"
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                      )}
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
    </div>
  )
}
