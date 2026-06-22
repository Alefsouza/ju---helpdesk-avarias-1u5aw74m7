import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download,
  Loader2,
  ArrowLeft,
  AlertCircle,
  FileText,
  FileSignature,
  Search,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useDocumentAction } from '@/hooks/use-document-action'

export default function ValesAprovadosDP() {
  const { profile, loading: authLoading } = useAuth()
  const { handleDocumentAction, loadingAction } = useDocumentAction()
  const [parcelas, setParcelas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadMonth, setDownloadMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [searchTerm, setSearchTerm] = useState('')
  const [garageFilter, setGarageFilter] = useState('Todas')

  useEffect(() => {
    fetchData()
  }, [downloadMonth])

  const fetchData = async () => {
    if (!downloadMonth) return
    setLoading(true)

    const [yearStr, monthStr] = downloadMonth.split('-')
    const yearNum = Number(yearStr)
    const monthNum = Number(monthStr)

    const startDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`

    const { data: parcelasData, error } = await supabase
      .from('parcelas_vales')
      .select(`
      id, 
      valor_parcela, 
      data_referencia, 
      chamado_id, 
      aprovado_diretoria,
      chamados (
        id, 
        titulo,
        usuario_id, 
        nome_motorista, 
        registro_motorista, 
        status_aprovacao,
        aprovacoes_diretoria,
        garagem,
        formularios_espelho_danos ( registro_motorista, nome_motorista ),
        solicitacoes_parcelamento ( registro, nome ),
        documentos ( id, nome_arquivo, arquivo_url, tipo_documento, orcamento_url, criado_em ),
        anexos_chamado_interno ( id, nome_arquivo, arquivo_url, criado_em )
      )
    `)
      .eq('data_referencia', startDate)
      .order('data_referencia', { ascending: false })

    if (error) {
      toast.error('Erro ao buscar parcelas')
      setLoading(false)
      return
    }

    const validParcelas =
      parcelasData?.filter((p: any) => {
        const chamado = p.chamados
        if (!chamado) return false

        if (p.aprovado_diretoria === true) return true

        let aprovacoes: any[] = []
        try {
          if (Array.isArray(chamado.aprovacoes_diretoria)) {
            aprovacoes = chamado.aprovacoes_diretoria
          } else if (typeof chamado.aprovacoes_diretoria === 'string') {
            aprovacoes = JSON.parse(chamado.aprovacoes_diretoria)
          }
        } catch {
          /* intentionally ignored */
        }

        const hasAprovacao =
          Array.isArray(aprovacoes) &&
          aprovacoes.some((a: any) => String(a?.acao).toLowerCase() === 'aprovado')

        return chamado.status_aprovacao === 'aprovado' || hasAprovacao
      }) || []

    const userIds = [
      ...new Set(validParcelas.map((p: any) => p.chamados?.usuario_id).filter(Boolean)),
    ]

    let usersMap = new Map()
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('perfil_usuario')
        .select('id, nome_completo, registro, garagem')
        .in('id', userIds)

      usersMap = new Map((usersData || []).map((u) => [u.id, u]))
    }

    const formatted = validParcelas.map((p: any) => {
      const chamado = p.chamados
      const user = chamado?.usuario_id ? usersMap.get(chamado.usuario_id) : null

      const espelhoData = Array.isArray(chamado.formularios_espelho_danos)
        ? chamado.formularios_espelho_danos[0]
        : chamado.formularios_espelho_danos

      const solicitacaoData = Array.isArray(chamado.solicitacoes_parcelamento)
        ? chamado.solicitacoes_parcelamento[0]
        : chamado.solicitacoes_parcelamento

      const registro =
        solicitacaoData?.registro ||
        espelhoData?.registro_motorista ||
        chamado.registro_motorista ||
        user?.registro ||
        'N/A'
      const nome =
        solicitacaoData?.nome ||
        espelhoData?.nome_motorista ||
        chamado.nome_motorista ||
        user?.nome_completo ||
        'N/A'
      const garagem = chamado.garagem || user?.garagem || 'N/A'

      let orcamentoUrl = null
      let orcamentoId = null
      let orcamentoNome = null
      if (chamado.documentos && chamado.documentos.length > 0) {
        const orcamentos = chamado.documentos.filter(
          (d: any) => d.tipo_documento === 'orcamento' || d.orcamento_url,
        )
        if (orcamentos.length > 0) {
          orcamentoUrl = orcamentos[0].orcamento_url || orcamentos[0].arquivo_url
          orcamentoId = orcamentos[0].id
          orcamentoNome = orcamentos[0].nome_arquivo
        }
      }

      let autorizacaoUrl = null
      let autorizacaoId = null
      let autorizacaoNome = null

      if (chamado.anexos_chamado_interno && chamado.anexos_chamado_interno.length > 0) {
        const autorizacoes = chamado.anexos_chamado_interno.filter((a: any) => {
          const nomeArq = a.nome_arquivo?.toLowerCase() || ''
          return (
            nomeArq.includes('autorização') ||
            nomeArq.includes('autorizacao') ||
            nomeArq.includes('desconto') ||
            nomeArq.includes('parcelamento')
          )
        })
        if (autorizacoes.length > 0) {
          autorizacaoUrl = autorizacoes[0].arquivo_url
          autorizacaoId = autorizacoes[0].id
          autorizacaoNome = autorizacoes[0].nome_arquivo
        }
      }

      if (!autorizacaoUrl && chamado.documentos && chamado.documentos.length > 0) {
        const autorizacoesDoc = chamado.documentos.filter((d: any) => {
          const nomeArq = d.nome_arquivo?.toLowerCase() || ''
          return (
            d.tipo_documento === 'autorizacao_desconto' ||
            d.tipo_documento === 'autorizacao' ||
            nomeArq.includes('autorização') ||
            nomeArq.includes('autorizacao') ||
            nomeArq.includes('desconto') ||
            nomeArq.includes('parcelamento')
          )
        })
        if (autorizacoesDoc.length > 0) {
          autorizacaoUrl = autorizacoesDoc[0].arquivo_url
          autorizacaoId = autorizacoesDoc[0].id
          autorizacaoNome = autorizacoesDoc[0].nome_arquivo
        }
      }

      const valorCalculado = Number(p.valor_parcela)

      return {
        id: p.id,
        chamado_id: p.chamado_id,
        chamado_titulo: chamado?.titulo || '-',
        valor_parcela: valorCalculado,
        data_referencia: p.data_referencia,
        aprovado_diretoria: p.aprovado_diretoria,
        nome,
        registro,
        garagem,
        orcamentoUrl,
        orcamentoId,
        orcamentoNome,
        autorizacaoUrl,
        autorizacaoId,
        autorizacaoNome,
      }
    })

    setParcelas(formatted)
    setLoading(false)
  }

  const filteredParcelas = parcelas.filter((p) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      p.nome.toLowerCase().includes(searchLower) ||
      p.registro.toLowerCase().includes(searchLower) ||
      p.chamado_titulo.toLowerCase().includes(searchLower)

    const matchesGarage =
      garageFilter === 'Todas' ||
      (p.garagem && p.garagem.toLowerCase() === garageFilter.toLowerCase())

    return matchesSearch && matchesGarage
  })

  const handleDownload = () => {
    const exportableParcelas = filteredParcelas.filter((p) => p.aprovado_diretoria === true)

    if (exportableParcelas.length === 0) {
      return toast.info('Nenhuma parcela aprovada pela diretoria encontrada para exportação.')
    }

    toast.loading('Gerando arquivo TXT...', { id: 'export-txt' })

    try {
      const txtRows = exportableParcelas.map((p) => {
        const rawRegistro = String(p.registro).replace(/\D/g, '') || '0'
        const registroPadded = rawRegistro.padStart(6, '0')

        const codigo = '261'

        const valueNum = Number(p.valor_parcela)
        const valueStr = valueNum.toFixed(2).replace('.', ',')
        const valorPadded = valueStr.padStart(15, '0')

        return `${registroPadded}\t${codigo}\t${valorPadded}`
      })

      const txtContent = txtRows.join('\n')
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `vales_${downloadMonth}.txt`
      link.click()

      toast.success('Arquivo TXT gerado com sucesso!', { id: 'export-txt' })
    } catch (error) {
      toast.error('Erro ao gerar arquivo TXT.', { id: 'export-txt' })
    }
  }

  if (authLoading) {
    return null
  }

  if (profile?.departamento !== 'DP' && profile?.tipo_usuario !== 'dp') {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-slate-500">Esta página é exclusiva para o departamento DP.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {profile?.tipo_usuario === 'admin' && (
        <div className="mb-4">
          <Button variant="ghost" asChild className="-ml-4 text-slate-500 hover:text-slate-900">
            <Link to="/dashboard/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Painel Admin
            </Link>
          </Button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vales Aprovados</h1>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe as parcelas de vales e gere o relatório de descontos.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar registro, nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white border-slate-200"
            />
          </div>

          <Select value={garageFilter} onValueChange={setGarageFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-white border-slate-200">
              <SelectValue placeholder="Garagem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas as Garagens</SelectItem>
              <SelectItem value="Cursino">Cursino</SelectItem>
              <SelectItem value="Sapopemba">Sapopemba</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="month"
            value={downloadMonth}
            onChange={(e) => setDownloadMonth(e.target.value)}
            className="w-full sm:w-48 bg-white border-slate-200"
          />
          <Button
            onClick={handleDownload}
            className="w-full sm:w-auto bg-[#225f3d] hover:bg-[#1a4a2f]"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar TXT
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Chamado</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Garagem</TableHead>
                <TableHead>Valor Parcela</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead className="pr-6 text-right">Documentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredParcelas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhuma parcela de vale encontrada para os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredParcelas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-medium">{p.chamado_titulo}</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.registro}</TableCell>
                    <TableCell>{p.nome}</TableCell>
                    <TableCell>
                      {p.garagem !== 'N/A' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                          {p.garagem}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>R$ {Number(p.valor_parcela).toFixed(2)}</TableCell>
                    <TableCell>
                      {format(new Date(p.data_referencia + 'T00:00:00'), 'MM/yyyy')}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-2">
                        {p.orcamentoUrl ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-700 p-0"
                                onClick={() =>
                                  handleDocumentAction(
                                    p.orcamentoId || p.id,
                                    p.orcamentoUrl,
                                    p.orcamentoNome || 'orcamento.pdf',
                                    'view',
                                  )
                                }
                                disabled={loadingAction === `${p.orcamentoId || p.id}-view`}
                              >
                                {loadingAction === `${p.orcamentoId || p.id}-view` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver Orçamento</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-8 w-8 flex items-center justify-center text-slate-300 cursor-not-allowed">
                                <FileText className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Orçamento não anexado</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {p.autorizacaoUrl ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-700 p-0"
                                onClick={() =>
                                  handleDocumentAction(
                                    p.autorizacaoId || p.id,
                                    p.autorizacaoUrl,
                                    p.autorizacaoNome || 'autorizacao.pdf',
                                    'view',
                                  )
                                }
                                disabled={loadingAction === `${p.autorizacaoId || p.id}-view`}
                              >
                                {loadingAction === `${p.autorizacaoId || p.id}-view` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FileSignature className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver Autorização de Desconto</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-8 w-8 flex items-center justify-center text-slate-300 cursor-not-allowed">
                                <FileSignature className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Autorização não anexada</p>
                            </TooltipContent>
                          </Tooltip>
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
    </div>
  )
}
