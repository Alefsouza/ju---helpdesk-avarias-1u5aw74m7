import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  FileText,
  Download,
  Loader2,
  FolderOpen,
  Copy,
  ExternalLink,
  Search,
  X,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Database } from '@/lib/supabase/types'

type Documento = Database['public']['Tables']['documentos']['Row']

const ITEMS_PER_PAGE = 20

export default function Documentos() {
  const { profile } = useAuth()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos')
  const [registroFiltro, setRegistroFiltro] = useState<string>('todos')
  const [currentPage, setCurrentPage] = useState(1)

  const isAdmin = profile?.tipo_usuario === 'admin'
  const isResponsavel = profile?.tipo_usuario === 'responsavel'

  useEffect(() => {
    if (!isAdmin && !isResponsavel) return

    const fetchDocumentos = async () => {
      try {
        const { data, error } = await supabase
          .from('documentos')
          .select('*')
          .order('criado_em', { ascending: false })

        if (error) throw error
        setDocumentos(data || [])
      } catch (error: any) {
        console.error('Erro ao buscar documentos:', error)
        toast.error('Não foi possível carregar os documentos.')
      } finally {
        setLoading(false)
      }
    }

    fetchDocumentos()
  }, [isAdmin, isResponsavel])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, tipoFiltro, registroFiltro])

  const registrosUnicos = useMemo(() => {
    const regs = documentos.map((d) => d.registro_responsavel).filter(Boolean) as string[]
    return Array.from(new Set(regs)).sort()
  }, [documentos])

  const documentosFiltrados = useMemo(() => {
    return documentos.filter((doc) => {
      const matchSearch = doc.nome_arquivo.toLowerCase().includes(search.toLowerCase())
      const matchTipo = tipoFiltro === 'todos' || doc.tipo_documento === tipoFiltro
      const matchRegistro =
        registroFiltro === 'todos' || doc.registro_responsavel === registroFiltro
      return matchSearch && matchTipo && matchRegistro
    })
  }, [documentos, search, tipoFiltro, registroFiltro])

  const totalPages = Math.ceil(documentosFiltrados.length / ITEMS_PER_PAGE)
  const paginatedDocs = documentosFiltrados.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  const handleCopyLink = (path: string) => {
    const url = `${window.location.origin}${path}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado para a área de transferência')
  }

  const handleDocumentAction = async (doc: Documento, action: 'view' | 'download') => {
    try {
      const url = doc.arquivo_url
      let finalUrl = url

      // Tenta gerar Signed URL se for arquivo do Supabase Storage
      if (url.includes('/storage/v1/object/public/')) {
        const parts = url.split('/public/')
        if (parts.length === 2) {
          const pathParts = parts[1].split('/')
          const bucketName = pathParts[0]
          const filePath = pathParts.slice(1).join('/')

          const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 3600, {
              download: action === 'download' ? doc.nome_arquivo : false,
            })

          if (!error && data?.signedUrl) {
            finalUrl = data.signedUrl
          }
        }
      } else if (action === 'download') {
        const separator = url.includes('?') ? '&' : '?'
        finalUrl = `${url}${separator}download=true`
      }

      if (action === 'view') {
        window.open(finalUrl, '_blank', 'noopener,noreferrer')
      } else {
        const link = document.createElement('a')
        link.href = finalUrl
        link.download = doc.nome_arquivo || 'documento'
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Erro ao acessar o documento:', error)
      toast.error('Erro ao acessar o documento. Tente novamente mais tarde.')
    }
  }

  if (!isAdmin && !isResponsavel) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
        <FolderOpen className="w-12 h-12 mb-4 text-slate-300" />
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Documentos</h1>
        <p className="text-slate-500 mt-1">Histórico de documentos gerados no sistema.</p>
      </div>

      {/* Seção 1 — Links fixos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Formulário Boletim de Ocorrência
            </CardTitle>
            <CardDescription>
              Link público para preenchimento de Boletim de Ocorrência.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <div className="bg-slate-50 px-3 py-2 rounded-md flex-1 truncate text-sm text-slate-500 border border-slate-200 select-all">
              {window.location.origin}/ido-fixo
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopyLink('/ido-fixo')}
              title="Copiar link"
              className="shrink-0"
            >
              <Copy className="w-4 h-4 text-slate-600" />
            </Button>
            <Button variant="outline" size="icon" asChild title="Abrir link" className="shrink-0">
              <a href="/ido-fixo" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 text-slate-600" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Formulário Espelho de Danos
            </CardTitle>
            <CardDescription>Link público para preenchimento de Espelho de Danos</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <div className="bg-slate-50 px-3 py-2 rounded-md flex-1 truncate text-sm text-slate-500 border border-slate-200 select-all">
              {window.location.origin}/espelho-danos-fixo
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopyLink('/espelho-danos-fixo')}
              title="Copiar link"
              className="shrink-0"
            >
              <Copy className="w-4 h-4 text-slate-600" />
            </Button>
            <Button variant="outline" size="icon" asChild title="Abrir link" className="shrink-0">
              <a href="/espelho-danos-fixo" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 text-slate-600" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Seção 2 — Filtros e pesquisa */}
      <Card className="shadow-sm border-slate-200/60">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar documento..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-56">
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="IDO">BO</SelectItem>
                <SelectItem value="Espelho de Danos">Espelho de Danos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-56">
            <Select value={registroFiltro} onValueChange={setRegistroFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Registro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Registros</SelectItem>
                {registrosUnicos.map((reg) => (
                  <SelectItem key={reg} value={reg}>
                    {reg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(search || tipoFiltro !== 'todos' || registroFiltro !== 'todos') && (
            <Button
              variant="ghost"
              className="text-slate-500 hover:text-slate-900 shrink-0"
              onClick={() => {
                setSearch('')
                setTipoFiltro('todos')
                setRegistroFiltro('todos')
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Seção 3 — Lista de documentos */}
      <Card className="shadow-sm border-slate-200/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : paginatedDocs.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Nenhum documento encontrado</h3>
              <p className="text-slate-500 text-sm mt-1">
                Ajuste os filtros ou aguarde novos registros.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View (Cards) */}
              <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                {paginatedDocs.map((doc) => (
                  <Card key={doc.id} className="border border-slate-200 shadow-sm overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h4
                          className="font-medium text-slate-900 line-clamp-2"
                          title={doc.nome_arquivo}
                        >
                          {doc.nome_arquivo}
                        </h4>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="bg-slate-50 font-normal">
                            {doc.tipo_documento === 'IDO' ? 'BO' : doc.tipo_documento}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {format(new Date(doc.criado_em), 'dd/MM/yy HH:mm')}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-md text-sm space-y-2 border border-slate-100">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 shrink-0">Responsável:</span>
                          <span className="font-medium text-slate-700 text-right truncate">
                            {doc.nome_responsavel || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 shrink-0">Registro:</span>
                          <span className="text-slate-700 truncate">
                            {doc.registro_responsavel || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 shrink-0">Cargo:</span>
                          <span className="text-slate-700 truncate">
                            {doc.cargo_responsavel || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDocumentAction(doc, 'view')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDocumentAction(doc, 'download')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop View (Table) */}
              <div className="hidden md:block w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead>Documento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDocs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell
                          className="font-medium text-slate-700 max-w-[250px] truncate"
                          title={doc.nome_arquivo}
                        >
                          {doc.nome_arquivo}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50 font-normal">
                            {doc.tipo_documento === 'IDO' ? 'BO' : doc.tipo_documento}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {doc.registro_responsavel || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 truncate max-w-[150px]">
                          {doc.nome_responsavel || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 truncate max-w-[150px]">
                          {doc.cargo_responsavel || '-'}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                          {format(new Date(doc.criado_em), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 bg-white hover:bg-slate-50"
                              onClick={() => handleDocumentAction(doc, 'view')}
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8"
                              onClick={() => handleDocumentAction(doc, 'download')}
                              title="Baixar arquivo"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Baixar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                  <span className="text-sm text-slate-500">
                    Mostrando página <span className="font-medium">{currentPage}</span> de{' '}
                    <span className="font-medium">{totalPages}</span>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
