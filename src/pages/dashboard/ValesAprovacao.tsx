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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ValesAprovacaoTable } from '@/components/vales-aprovacao-table'

const CLAUDINEI_KEYWORDS = [
  'vale',
  'quitação',
  'quitacao',
  'recibo',
  'nf',
  'nota fiscal',
  'boleto',
  'escaneado',
  'autorização',
  'autorizacao',
  'desconto',
]

const hasApprovalTrigger = (anexos: any[]) =>
  anexos.some((a) => {
    const nome = (a.nome_arquivo || '').toLowerCase()
    return CLAUDINEI_KEYWORDS.some((kw) => nome.includes(kw))
  })

const countAprovacoes = (aprovacoes: any) =>
  Array.isArray(aprovacoes)
    ? aprovacoes.filter((a: any) => a.acao === 'aprovado' || !a.acao).length
    : 0

export default function ValesAprovacao() {
  const { user, profile } = useAuth()
  const [pendingChamados, setPendingChamados] = useState<any[]>([])
  const [approvedChamados, setApprovedChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('pendentes')
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [selectedChamado, setSelectedChamado] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [valeUnificado, setValeUnificado] = useState(false)

  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const fetchChamados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chamados')
      .select(`
        id, titulo, descricao, status_aprovacao, status_aprovacao_claudinei, aprovacoes_diretoria, criado_em,
        registro_motorista, nome_motorista, data_ocorrencia,
        anexos_chamado_interno ( id, nome_arquivo, arquivo_url, criado_em ),
        documentos ( id, nome_arquivo, arquivo_url, tipo_documento, orcamento_url, valor_orcamento, criado_em ),
        parcelas_vales ( id, valor_parcela, data_referencia ),
        formularios_espelho_danos ( registro_motorista, nome_motorista ),
        solicitacoes_parcelamento ( id, valor_orcamento, quantidade_parcelas, status, desconto_aplicado, vale_unificado )
      `)
      .eq('status', 'finalizado')
      .or('status_aprovacao_alex.eq.aprovado,status_aprovacao_claudinei.eq.aprovado')
      .or(
        'status_aprovacao.is.null,status_aprovacao.eq.aprovacao_parcial,status_aprovacao.eq.pendente,status_aprovacao.eq.aprovado',
      )
      .order('atualizado_em', { ascending: false })

    if (error) {
      toast.error('Erro ao buscar chamados')
      setLoading(false)
      return
    }

    const filtered =
      data?.filter((c: any) => {
        const anexos = c.anexos_chamado_interno || []
        return hasApprovalTrigger(anexos)
      }) || []

    const pending = filtered.filter((c: any) => {
      const count = countAprovacoes(c.aprovacoes_diretoria)
      return count < 2 || c.status_aprovacao !== 'aprovado'
    })

    const approved = filtered.filter(
      (c: any) => countAprovacoes(c.aprovacoes_diretoria) >= 2 && c.status_aprovacao === 'aprovado',
    )

    setPendingChamados(pending)
    setApprovedChamados(approved)
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
    const sol = chamado.solicitacoes_parcelamento?.[0]
    setValeUnificado(sol?.vale_unificado === true)
    setIsApproveOpen(true)
  }

  const handleApproveSubmit = async () => {
    if (!selectedChamado) return
    setIsSubmitting(true)

    let hasDiscount = false
    if (
      selectedChamado.solicitacoes_parcelamento &&
      selectedChamado.solicitacoes_parcelamento.length > 0
    ) {
      const val = selectedChamado.solicitacoes_parcelamento[0].desconto_aplicado
      hasDiscount = val === true || val === 'true' || val === '1' || val === 1
    }

    const currentAprovacoes = Array.isArray(selectedChamado.aprovacoes_diretoria)
      ? selectedChamado.aprovacoes_diretoria
      : []

    const newAprovacao = {
      usuario_id: user!.id,
      nome_completo: profile?.nome_completo,
      acao: 'aprovado',
      data_hora: new Date().toISOString(),
      desconto_aplicado: hasDiscount,
    }

    const nextAprovacoes = [...currentAprovacoes, newAprovacao]
    const isFinished = nextAprovacoes.length >= 2
    const isFullyApproved =
      isFinished && nextAprovacoes.every((a: any) => a.acao === 'aprovado' || !a.acao)
    const isRejected = isFinished && !isFullyApproved
    const nextStatusAprovacao = isFinished
      ? isFullyApproved
        ? 'aprovado'
        : 'reprovado'
      : 'aprovacao_parcial'

    try {
      const updatePayload: any = {
        status_aprovacao: nextStatusAprovacao,
        aprovacoes_diretoria: nextAprovacoes,
        atualizado_em: new Date().toISOString(),
      }

      if (isFinished && isRejected) {
        updatePayload.status = 'em_andamento'
        updatePayload.status_interno = 'Reprovado Diretoria'
      }

      const { error } = await supabase
        .from('chamados')
        .update(updatePayload)
        .eq('id', selectedChamado.id)

      if (error) throw error

      await supabase.from('historico_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        acao: 'Aprovação Diretor',
        detalhes: isFinished
          ? isFullyApproved
            ? 'Vale aprovado pela diretoria com os valores previamente assinados (Aprovação Final)'
            : 'Vale reprovado após avaliação final'
          : 'Vale aprovado por um diretor com os valores previamente assinados (Aguardando segunda avaliação)',
      })

      if (isFinished && isRejected) {
        const motivos = nextAprovacoes
          .filter((a: any) => a.acao === 'recusado' && a.motivo)
          .map((a: any) => a.motivo)
          .join(' | ')
        await supabase.from('respostas_chamado').insert({
          chamado_id: selectedChamado.id,
          usuario_id: user!.id,
          mensagem: `Vale reprovado pela diretoria.${motivos ? ' Motivos: ' + motivos : ''}`,
        })
      }

      if (isFinished && isFullyApproved) {
        const ednaKeywords = ['vale', 'escaneado', 'desconto', 'autorização', 'autorizacao']
        const ednaAnexos = selectedChamado.anexos_chamado_interno || []
        const hasEdnaKeywords = ednaAnexos.some((a: any) => {
          const nome = (a.nome_arquivo || '').toLowerCase()
          return ednaKeywords.some((kw) => nome.includes(kw))
        })

        if (!hasEdnaKeywords) {
          await supabase.from('historico_chamado').insert({
            chamado_id: selectedChamado.id,
            usuario_id: user!.id,
            acao: 'Aprovação Diretor',
            detalhes: 'Aprovação final da diretoria concluída.',
          })
        } else {
          let totalValue = 0
          let parcelsCount = 1

          if (
            selectedChamado.solicitacoes_parcelamento &&
            selectedChamado.solicitacoes_parcelamento.length > 0
          ) {
            const sol = selectedChamado.solicitacoes_parcelamento[0]
            totalValue = Number(sol.valor_orcamento) || 0
            parcelsCount = Number(sol.quantidade_parcelas) || 1
          } else {
            const docVale = selectedChamado.documentos?.find(
              (d: any) => d.tipo_documento === 'Vale' && d.valor_orcamento,
            )
            if (docVale) {
              totalValue = Number(docVale.valor_orcamento) || 0
            }
          }

          if (totalValue > 0) {
            const { data: existingParcelas } = await supabase
              .from('parcelas_vales')
              .select('id')
              .eq('chamado_id', selectedChamado.id)

            if (!existingParcelas || existingParcelas.length === 0) {
              const valorFinal = totalValue

              if (
                selectedChamado.solicitacoes_parcelamento &&
                selectedChamado.solicitacoes_parcelamento.length > 0
              ) {
                await supabase
                  .from('solicitacoes_parcelamento')
                  .update({
                    status: 'aprovado',
                    desconto_aplicado: hasDiscount,
                    vale_unificado: valeUnificado,
                    atualizado_em: new Date().toISOString(),
                  })
                  .eq('id', selectedChamado.solicitacoes_parcelamento[0].id)
              }

              const { data: parcelasCalculadas, error: calcError } = await supabase.rpc(
                'calcular_parcelas_vale',
                {
                  p_valor_base: valorFinal,
                  p_quantidade_parcelas: parcelsCount,
                  p_data_base: new Date().toISOString().split('T')[0],
                },
              )

              if (calcError || !parcelasCalculadas) {
                console.error('Error calculating parcelas via RPC:', calcError)
              } else {
                const parcelasToInsert = parcelasCalculadas.map((p: any) => ({
                  chamado_id: selectedChamado.id,
                  valor_parcela: p.valor_parcela,
                  data_referencia: p.data_referencia,
                  aprovado_diretoria: true,
                  aprovado_em: new Date().toISOString(),
                  vale_unificado: valeUnificado,
                }))

                const { error: parcelasError } = await supabase
                  .from('parcelas_vales')
                  .insert(parcelasToInsert)
                if (parcelasError) console.error('Error creating parcelas:', parcelasError)
              }
            }
          }
        }
      }

      if (isFinished && isFullyApproved) {
        const anexosInternos = selectedChamado.anexos_chamado_interno || []

        const hasDPKeyword = anexosInternos.some((a: any) => {
          const nome = (a.nome_arquivo || '').toLowerCase()
          return ['vale', 'escaneado', 'autorização', 'autorizacao'].some((kw) => nome.includes(kw))
        })
        const hasFinanceiroKeyword = anexosInternos.some((a: any) => {
          const nome = (a.nome_arquivo || '').toLowerCase()
          return ['recibo', 'quitação', 'quitacao'].some((kw) => nome.includes(kw))
        })
        const hasContabilKeyword = anexosInternos.some((a: any) => {
          const nome = (a.nome_arquivo || '').toLowerCase()
          return ['boleto', 'nf', 'nota fiscal'].some((kw) => nome.includes(kw))
        })

        const alreadyRouted = [
          'DP',
          'aguardando_financeiro',
          'aguardando_contabil',
          'aguardando_contabil_e_financeiro',
        ].includes(selectedChamado.status_interno)

        let routingStatus: string | null = null
        if (!alreadyRouted) {
          if (hasDPKeyword) {
            routingStatus = 'DP'
          } else if (hasFinanceiroKeyword && hasContabilKeyword) {
            routingStatus = 'aguardando_contabil_e_financeiro'
          } else if (hasContabilKeyword) {
            routingStatus = 'aguardando_contabil'
          } else if (hasFinanceiroKeyword) {
            routingStatus = 'aguardando_financeiro'
          }
        }

        if (routingStatus) {
          await supabase
            .from('chamados')
            .update({
              status_interno: routingStatus,
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', selectedChamado.id)

          await supabase.from('historico_chamado').insert({
            chamado_id: selectedChamado.id,
            usuario_id: user!.id,
            acao: 'Roteamento Documentos',
            detalhes: `Chamado roteado para ${routingStatus.replace(/_/g, ' ')} baseado nos anexos internos.`,
          })
        }
      }

      if (isFinished && isRejected) {
        if (
          selectedChamado.solicitacoes_parcelamento &&
          selectedChamado.solicitacoes_parcelamento.length > 0
        ) {
          await supabase
            .from('solicitacoes_parcelamento')
            .update({ status: 'recusado', atualizado_em: new Date().toISOString() })
            .eq('id', selectedChamado.solicitacoes_parcelamento[0].id)
        }
      }

      toast.success(
        isFinished
          ? isFullyApproved
            ? 'Aprovação final da diretoria concluída!'
            : 'Vale reprovado finalizado!'
          : 'Aprovação registrada! Aguardando segundo diretor.',
      )
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

    const currentAprovacoes = Array.isArray(selectedChamado.aprovacoes_diretoria)
      ? selectedChamado.aprovacoes_diretoria
      : []

    const newAprovacao = {
      usuario_id: user!.id,
      nome_completo: profile?.nome_completo,
      acao: 'recusado',
      data_hora: new Date().toISOString(),
      motivo: rejectReason,
    }

    const nextAprovacoes = [...currentAprovacoes, newAprovacao]
    const isFinished = nextAprovacoes.length >= 2
    const nextStatusAprovacao = isFinished ? 'reprovado' : 'aprovacao_parcial'

    try {
      const updatePayload: any = {
        status_aprovacao: nextStatusAprovacao,
        aprovacoes_diretoria: nextAprovacoes,
        atualizado_em: new Date().toISOString(),
      }

      if (isFinished) {
        updatePayload.status = 'em_andamento'
        updatePayload.status_interno = 'Reprovado Diretoria'
      }

      const { error } = await supabase
        .from('chamados')
        .update(updatePayload)
        .eq('id', selectedChamado.id)

      if (error) throw error

      await supabase.from('historico_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        acao: 'Reprovação Diretor',
        detalhes: isFinished
          ? `Vale reprovado após avaliação final. Motivo: ${rejectReason}`
          : `Recusado por um diretor: ${rejectReason} (Aguardando segunda avaliação)`,
      })

      if (isFinished) {
        const motivos = nextAprovacoes
          .filter((a: any) => a.acao === 'recusado' && a.motivo)
          .map((a: any) => a.motivo)
          .join(' | ')
        await supabase.from('respostas_chamado').insert({
          chamado_id: selectedChamado.id,
          usuario_id: user!.id,
          mensagem: `Vale reprovado pela diretoria. Motivos: ${motivos}`,
        })

        if (
          selectedChamado.solicitacoes_parcelamento &&
          selectedChamado.solicitacoes_parcelamento.length > 0
        ) {
          await supabase
            .from('solicitacoes_parcelamento')
            .update({ status: 'recusado', atualizado_em: new Date().toISOString() })
            .eq('id', selectedChamado.solicitacoes_parcelamento[0].id)
        }
      }

      toast.success(
        isFinished ? 'Vale recusado com sucesso' : 'Recusa registrada! Aguardando segundo diretor.',
      )
      setIsRejectOpen(false)
      fetchChamados()
    } catch (error: any) {
      toast.error('Erro ao recusar vale')
    } finally {
      setIsSubmitting(false)
    }
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="pendentes">
            Pendentes de Aprovação
            <span className="ml-2 text-xs rounded-full bg-muted px-2 py-0.5">
              {pendingChamados.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="aprovados">
            Aprovados (2/2)
            <span className="ml-2 text-xs rounded-full bg-muted px-2 py-0.5">
              {approvedChamados.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ValesAprovacaoTable
                  chamados={pendingChamados}
                  userId={user!.id}
                  showActions
                  onApproveClick={handleApproveClick}
                  onRejectClick={handleRejectClick}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aprovados">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ValesAprovacaoTable
                  chamados={approvedChamados}
                  userId={user!.id}
                  showActions={false}
                  onApproveClick={handleApproveClick}
                  onRejectClick={handleRejectClick}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
