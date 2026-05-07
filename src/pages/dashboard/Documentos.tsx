import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Download, Loader2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Database } from '@/lib/supabase/types'

type Documento = Database['public']['Tables']['documentos']['Row']

export default function Documentos() {
  const { profile } = useAuth()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)

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

      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Arquivos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : documentos.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Nenhum documento encontrado</h3>
              <p className="text-slate-500 text-sm mt-1">Os documentos gerados aparecerão aqui.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead>Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell
                        className="font-medium text-slate-700 max-w-[250px] truncate"
                        title={doc.nome_arquivo}
                      >
                        {doc.nome_arquivo}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 font-normal">
                          {doc.tipo_documento}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">
                            {doc.nome_responsavel || 'N/A'}
                          </span>
                          {doc.registro_responsavel && (
                            <span className="text-xs text-slate-500">
                              RE: {doc.registro_responsavel}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                        {format(new Date(doc.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="hover:bg-primary/5 hover:text-primary"
                        >
                          <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-2" />
                            Baixar
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
