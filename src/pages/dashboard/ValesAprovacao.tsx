import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Check, X, FileText, Loader2, AlertCircle, FileSignature } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function ValesAprovacao() {
  const { user, profile } = useAuth()
  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [selectedChamado, setSelectedChamado] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const fetchChamados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chamados')
      .select(`
        id, titulo, descricao, status_aprovacao, aprovacoes_diretoria,
        registro_motorista, nome_motorista, data_ocorrencia,
        anexos_chamado_interno ( id, nome_arquivo, arquivo_url, criado_em ),
        documentos ( id, nome_arquivo, arquivo_url, tipo_documento, orcamento_url, criado_em ),
        parcelas_vales ( id, valor_parcela, data_referencia ),
        formularios_espelho_danos ( registro_motorista, nome_motorista ),
        solicitacoes_parcelamento ( id, valor_orcamento, quantidade_parcelas, status )
      `)
      .eq('status', 'finalizado')
      .or('status_aprovacao.is.null,status_aprovacao.eq.aprovacao_parcial')
      .order('atualizado_em', { ascending: false })

    if (error) {
      toast.error('Erro ao buscar chamados')
      setLoading(false)
      return
    }

    const filtered =
      data?.filter((c: any) => {
        const aprovacoes = Array.isArray(c.aprovacoes_diretoria) ? c.aprovacoes_diretoria : []
        if (aprovacoes.some((a: any) => a.usuario_id === user!.id)) return false

        const anexos = c.anexos_chamado_interno || []
        const hasAutorizacao = anexos.some((a: any) => {
          const nome = a.nome_arquivo.toLowerCase()
          return nome.includes('autorização') || nome.includes('autorizacao')
        })

        return hasAutorizacao
      }) || []

    setChamados(filtered)
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.departamento === 'Diretoria') {
      fetchChamados()
    } else {
      setLoading(false)
    }
  }, [profile])

  const handleApproveClick = (chamado: any) => {
    setSelectedChamado(chamado)
    setIsApproveOpen(true)
  }

  const handleApproveSubmit = async () => {
    if (!selectedChamado) return
    setIsSubmitting(true)

    const currentAprovacoes = Array.isArray(selectedChamado.aprovacoes_diretoria)
      ? selectedChamado.aprovacoes_diretoria
      : []

    const newAprovacao = {
      usuario_id: user!.id,
      data: new Date().toISOString(),
      nome: profile?.nome_completo,
    }

    try {
      const { error } = await supabase
        .from('chamados')
        .update({
          status_aprovacao: 'aprovado',
          aprovacoes_diretoria: [...currentAprovacoes, newAprovacao],
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', selectedChamado.id)

      if (error) throw error

      await supabase.from('historico_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        acao: 'Aprovação Diretor',
        detalhes: 'Vale aprovado pela diretoria',
      })

      toast.success('Vale aprovado com sucesso!')
      setIsApproveOpen(false)
      fetchChamados()
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao aprovar vale: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRejectClick = (chamado: any) => {
    setSelectedChamado(chamado)
    setRejectReason('')
    setIsRejectOpen(true)
  }

  const handleRejectSubmit = async () => {
    if (!selectedChamado || !rejectReason.trim()) {
      toast.error('Informe o motivo da recusa')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('chamados')
        .update({
          status_aprovacao: 'reprovado',
          status: 'em_andamento',
          status_interno: 'Reprovado Diretoria',
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', selectedChamado.id)

      if (error) throw error

      await supabase.from('respostas_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        mensagem: `Vale reprovado pela diretoria. Motivo: ${rejectReason}`,
      })

      await supabase.from('historico_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        acao: 'Reprovação Diretor',
        detalhes: `Recusado pela diretoria: ${rejectReason}`,
      })

      toast.success('Vale recusado com sucesso')
      setIsRejectOpen(false)
      fetchChamados()
    } catch (error: any) {
      toast.error('Erro ao recusar vale')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDriverData = (chamado: any) => {
    const espelhoData = Array.isArray(chamado.formularios_espelho_danos)
      ? chamado.formularios_espelho_danos[0]
      : chamado.formularios_espelho_danos

    return {
      registro: espelhoData?.registro_motorista || chamado.registro_motorista || '-',
      nome: espelhoData?.nome_motorista || chamado.nome_motorista || '-',
    }
  }

  const getOrcamentoUrl = (chamado: any) => {
    if (!chamado.documentos || chamado.documentos.length === 0) return null
    const orcamentos = chamado.documentos.filter(
      (d: any) => d.tipo_documento === 'orcamento' || d.orcamento_url,
    )
    if (orcamentos.length > 0) {
      return orcamentos[0].orcamento_url || orcamentos[0].arquivo_url
    }
    return null
  }

  const getAutorizacaoUrl = (chamado: any) => {
    if (!chamado.anexos_chamado_interno || chamado.anexos_chamado_interno.length === 0) return null
    const autorizacoes = chamado.anexos_chamado_interno.filter((a: any) => {
      const nome = a.nome_arquivo.toLowerCase()
      return nome.includes('autorização') || nome.includes('autorizacao')
    })
    if (autorizacoes.length > 0) {
      return autorizacoes[0].arquivo_url
    }
    return null
  }

  if (profile?.departamento !== 'Diretoria') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Esta página é exclusiva para a Diretoria.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vales para Aprovação</h1>
          <p className="text-muted-foreground">Gerencie as aprovações de desconto em folha.</p>
        </div>
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
              <p className="text-lg font-medium text-muted-foreground">
                Nenhum vale pendente de aprovação
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chamado</TableHead>
                    <TableHead>Registro do Motorista</TableHead>
                    <TableHead>Nome do Motorista</TableHead>
                    <TableHead>Data da Ocorrência</TableHead>
                    <TableHead>Aprovações</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chamados.map((chamado) => {
                    const driver = getDriverData(chamado)
                    const orcamentoUrl = getOrcamentoUrl(chamado)
                    const autorizacaoUrl = getAutorizacaoUrl(chamado)
                    const aprovacoes = Array.isArray(chamado.aprovacoes_diretoria)
                      ? chamado.aprovacoes_diretoria
                      : []
                    return (
                      <TableRow key={chamado.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{chamado.titulo || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{driver.registro}</TableCell>
                        <TableCell>{driver.nome}</TableCell>
                        <TableCell>
                          {chamado.data_ocorrencia
                            ? format(new Date(chamado.data_ocorrencia + 'T12:00:00'), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${aprovacoes.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}
                            />
                            <span>{aprovacoes.length} Aprov.</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {orcamentoUrl ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={orcamentoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <FileText className="h-5 w-5" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver Orçamento</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-muted-foreground/30 cursor-not-allowed">
                                    <FileText className="h-5 w-5" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Orçamento não anexado</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {autorizacaoUrl ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={autorizacaoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <FileSignature className="h-5 w-5" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver Autorização de Desconto</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-muted-foreground/30 cursor-not-allowed">
                                    <FileSignature className="h-5 w-5" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Autorização não anexada</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                  onClick={() => handleApproveClick(chamado)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Aprovar</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                  onClick={() => handleRejectClick(chamado)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Recusar</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
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

      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aprovação</DialogTitle>
            <DialogDescription>Deseja confirmar a aprovação deste vale?</DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApproveSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Vale</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O chamado retornará para análise.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejectReason">Motivo</Label>
              <Input
                id="rejectReason"
                placeholder="Ex: Valor incorreto..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
