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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function OsManutencao() {
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [docToDelete, setDocToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewDoc, setViewDoc] = useState<any>(null)

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
      doc.linha?.toLowerCase().includes(search.toLowerCase()) ||
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
                      <TableHead className="w-[160px] font-semibold">Carro / Linha</TableHead>
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
                              {doc.linha || doc.garagem || '-'}
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

      <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pr-12 border-b bg-slate-50 flex flex-row items-center justify-between space-y-0">
            <DialogTitle>Visualizar Documento</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                if (viewDoc) handleDownload(viewDoc.arquivo_url, e as any)
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-slate-100/50 p-4">
            {viewDoc &&
              (viewDoc.arquivo_url?.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={viewDoc.arquivo_url}
                  className="w-full h-full rounded-md border bg-white"
                  title="Documento PDF"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={viewDoc.arquivo_url}
                    alt="Documento"
                    className="max-w-full max-h-full object-contain rounded-md border bg-white"
                  />
                </div>
              ))}
          </div>
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
