import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, AlertCircle, FileText, Check } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

const FINANCEIRO_KEYWORDS = ['recibo', 'quitação', 'quitacao']

const hasReciboInNome = (nomeArquivo: string) => {
  const nome = (nomeArquivo || '').toLowerCase()
  return FINANCEIRO_KEYWORDS.some((kw) => nome.includes(kw))
}

export default function ValoresAprovadosFinanceiro() {
  const { profile } = useAuth()
  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChamados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chamados')
      .select(
        `id, titulo, status_interno, status_aprovacao, status_aprovacao_alex, status_aprovacao_claudinei, criado_em, registro_motorista, nome_motorista, data_ocorrencia, numero_os,
         documentos ( id, nome_arquivo, arquivo_url, tipo_documento, valor_orcamento ),
         anexos_chamado_interno ( id, nome_arquivo, arquivo_url, criado_em ),
         formularios_espelho_danos ( nome_motorista )`,
      )
      .or('status_aprovacao.eq.aprovado,status_interno.eq.aprovado_contabil')
      .order('atualizado_em', { ascending: false })

    if (error) {
      toast.error('Erro ao buscar chamados')
      setLoading(false)
      return
    }

    const filtered =
      data?.filter((c: any) => {
        const isContabilApproved = c.status_interno === 'aprovado_contabil'
        const anexos = c.anexos_chamado_interno || []
        const hasReciboAnexo = anexos.some((a: any) => hasReciboInNome(a.nome_arquivo))
        const hasDiretoriaApproval = c.status_aprovacao === 'aprovado'
        return isContabilApproved || (hasDiretoriaApproval && hasReciboAnexo)
      }) || []

    setChamados(filtered)
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.tipo_usuario === 'financeiro') {
      fetchChamados()
    } else {
      setLoading(false)
    }
  }, [profile])

  if (profile?.tipo_usuario !== 'financeiro') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Esta página é exclusiva para o Financeiro.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Valores Aprovados</h1>
        <p className="text-muted-foreground">
          Chamados aprovados pela Diretoria com documentos para Financeiro.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chamados.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Check className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum chamado disponível</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chamado</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Data Ocorrência</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chamados.map((chamado) => {
                    const docs = chamado.documentos || []
                    const reciboDocs = docs.filter(
                      (d: any) => d.tipo_documento === 'Recibo' || hasReciboInNome(d.nome_arquivo),
                    )
                    const valorDoc = docs.find((d: any) => d.valor_orcamento)
                    const reciboAnexos = (chamado.anexos_chamado_interno || []).filter((a: any) =>
                      hasReciboInNome(a.nome_arquivo),
                    )
                    return (
                      <TableRow key={chamado.id}>
                        <TableCell>
                          <Link
                            to={`/dashboard/chamados/${chamado.id}`}
                            className="font-medium text-primary hover:underline transition-colors"
                          >
                            {chamado.titulo || '-'}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>
                              {chamado.nome_motorista ||
                                (Array.isArray(chamado.formularios_espelho_danos) &&
                                chamado.formularios_espelho_danos.length > 0
                                  ? chamado.formularios_espelho_danos[0].nome_motorista
                                  : chamado.formularios_espelho_danos?.nome_motorista) ||
                                '-'}
                            </div>
                            <div className="text-muted-foreground">
                              {chamado.registro_motorista || '-'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {chamado.data_ocorrencia
                            ? format(new Date(chamado.data_ocorrencia + 'T12:00:00'), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {reciboDocs.map((doc: any) => (
                              <a
                                key={doc.id}
                                href={doc.arquivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                              >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="truncate max-w-[150px]">{doc.nome_arquivo}</span>
                              </a>
                            ))}
                            {reciboAnexos.map((anexo: any) => (
                              <a
                                key={anexo.id}
                                href={anexo.arquivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                              >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="truncate max-w-[150px]">{anexo.nome_arquivo}</span>
                              </a>
                            ))}
                            {reciboDocs.length === 0 && reciboAnexos.length === 0 && (
                              <span className="text-muted-foreground text-sm">
                                Contábil aprovado
                              </span>
                            )}
                          </div>
                        </TableCell>{' '}
                        <TableCell>
                          {valorDoc?.valor_orcamento
                            ? `R$ ${Number(valorDoc.valor_orcamento).toFixed(2)}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
