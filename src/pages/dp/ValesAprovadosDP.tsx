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
import { Download, Loader2, ArrowLeft, AlertCircle, FileText, FileSignature } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export default function ValesAprovadosDP() {
  const { profile, loading: authLoading } = useAuth()
  const [parcelas, setParcelas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadMonth, setDownloadMonth] = useState(() => format(new Date(), 'yyyy-MM'))

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
          formularios_espelho_danos ( registro_motorista, nome_motorista ),
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
        .select('id, nome_completo, registro')
        .in('id', userIds)

      usersMap = new Map((usersData || []).map((u) => [u.id, u]))
    }

    const formatted = validParcelas.map((p: any) => {
      const chamado = p.chamados
      const user = chamado?.usuario_id ? usersMap.get(chamado.usuario_id) : null

      const espelhoData = Array.isArray(chamado.formularios_espelho_danos)
        ? chamado.formularios_espelho_danos[0]
        : chamado.formularios_espelho_danos

      const registro =
        espelhoData?.registro_motorista || chamado.registro_motorista || user?.registro || 'N/A'
      const nome =
        espelhoData?.nome_motorista || chamado.nome_motorista || user?.nome_completo || 'N/A'

      let orcamentoUrl = null
      if (chamado.documentos && chamado.documentos.length > 0) {
        const orcamentos = chamado.documentos.filter(
          (d: any) => d.tipo_documento === 'orcamento' || d.orcamento_url,
        )
        if (orcamentos.length > 0) {
          orcamentoUrl = orcamentos[0].orcamento_url || orcamentos[0].arquivo_url
        }
      }

      let autorizacaoUrl = null
      if (chamado.anexos_chamado_interno && chamado.anexos_chamado_interno.length > 0) {
        const autorizacoes = chamado.anexos_chamado_interno.filter((a: any) => {
          const nomeArq = a.nome_arquivo.toLowerCase()
          return nomeArq.includes('autorização') || nomeArq.includes('autorizacao')
        })
        if (autorizacoes.length > 0) {
          autorizacaoUrl = autorizacoes[0].arquivo_url
        }
      }

      return {
        id: p.id,
        chamado_id: p.chamado_id,
        chamado_titulo: chamado?.titulo || '-',
        valor_parcela: p.valor_parcela,
        data_referencia: p.data_referencia,
        nome,
        registro,
        orcamentoUrl,
        autorizacaoUrl,
      }
    })

    setParcelas(formatted)
    setLoading(false)
  }

  const handleDownload = () => {
    if (parcelas.length === 0) {
      return toast.info('Nenhuma parcela válida encontrada para o mês selecionado.')
    }

    const csvRows = ['Registro,Nome Completo,Valor Parcela,Referência']
    parcelas.forEach((p) => {
      const dataRef = format(new Date(p.data_referencia + 'T00:00:00'), 'MM/yyyy')
      csvRows.push(`${p.registro},"${p.nome}",${p.valor_parcela},${dataRef}`)
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `vales_${downloadMonth}.csv`
    link.click()
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vales Aprovados</h1>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe as parcelas de vales e gere o relatório de descontos.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="month"
            value={downloadMonth}
            onChange={(e) => setDownloadMonth(e.target.value)}
            className="w-48 bg-white border-slate-200"
          />
          <Button onClick={handleDownload} className="bg-[#225f3d] hover:bg-[#1a4a2f]">
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
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
                <TableHead>Valor Parcela</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead className="pr-6 text-right">Documentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : parcelas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhuma parcela de vale aprovado encontrada para este mês.
                  </TableCell>
                </TableRow>
              ) : (
                parcelas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-medium">{p.chamado_titulo}</span>
                        <span className="text-xs text-slate-500">
                          #{p.chamado_id.split('-')[0].toUpperCase()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{p.registro}</TableCell>
                    <TableCell>{p.nome}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>R$ {Number(p.valor_parcela).toFixed(2)}</span>
                        <span className="text-[10px] text-emerald-600 font-medium whitespace-nowrap">
                          10% desc. aplicado
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(p.data_referencia + 'T00:00:00'), 'MM/yyyy')}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-2">
                        {p.orcamentoUrl ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={p.orcamentoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 hover:text-slate-700"
                              >
                                <FileText className="h-4 w-4" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver Orçamento</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-slate-300 cursor-not-allowed">
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
                              <a
                                href={p.autorizacaoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 hover:text-slate-700"
                              >
                                <FileSignature className="h-4 w-4" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver Autorização de Desconto</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-slate-300 cursor-not-allowed">
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
