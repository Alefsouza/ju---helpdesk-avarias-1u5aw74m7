import { useState, useEffect, useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ValesAprovacaoTable } from '@/components/vales-aprovacao-table'

const stripAccents = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const CLAUDINEI_KEYWORDS = ['vale', 'autorização', 'autorizacao', 'desconto', 'escaneado']

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
  const [approvedByYouChamados, setApprovedByYouChamados] = useState<any[]>([])
  const [approvedChamados, setApprovedChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('pendentes')
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [selectedChamado, setSelectedChamado] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [valeUnificado, setValeUnificado] = useState(false)

  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [departamentoFilter, setDepartamentoFilter] = useState<'todos' | 'juridico' | 'sinistro'>(
    'todos',
  )

  const matchesDepartamento = (c: any, filter: 'todos' | 'juridico' | 'sinistro'): boolean => {
    if (filter === 'todos') return true
    const dep = stripAccents(c.departamento_finalizador || '')
    const isJuridico = dep.includes('juridico')
    const isSinistro = dep.includes('sinistro')
    if (filter === 'juridico') return isJuridico
    if (filter === 'sinistro') return isSinistro
    return true
  }

  const matchesSearch = (c: any, term: string): boolean => {
    if (!term) return true
    const t = term.toLowerCase()
    const fields = [c.titulo, c.pia, c.registro_motorista, c.nome_motorista]
    if (fields.some((f) => (f ?? '').toString().toLowerCase().includes(t))) {
      return true
    }
    const espelhos = c.formularios_espelho_danos
    if (Array.isArray(espelhos)) {
      if (
        espelhos.some(
          (e: any) =>
            (e?.registro_motorista ?? '').toString().toLowerCase().includes(t) ||
            (e?.nome_motorista ?? '').toString().toLowerCase().includes(t),
        )
      ) {
        return true
      }
    }
    const docs = c.documentos
    if (Array.isArray(docs)) {
      const vales = docs.filter((d: any) => d?.tipo_documento === 'Vale')
      if (
        vales.some(
          (v: any) =>
            (v?.registro_motorista ?? '').toString().toLowerCase().includes(t) ||
            (v?.nome_motorista ?? '').toString().toLowerCase().includes(t),
        )
      ) {
        return true
      }
    }
    return false
  }

  const filteredPendingChamados = useMemo(
    () =>
      pendingChamados.filter(
        (c) => matchesSearch(c, searchTerm) && matchesDepartamento(c, departamentoFilter),
      ),
    [pendingChamados, searchTerm, departamentoFilter],
  )

  const filteredApprovedChamados = useMemo(
    () =>
      approvedChamados.filter(
        (c) => matchesSearch(c, searchTerm) && matchesDepartamento(c, departamentoFilter),
      ),
    [approvedChamados, searchTerm, departamentoFilter],
  )

  const filteredApprovedByYouChamados = useMemo(
    () =>
      approvedByYouChamados.filter(
        (c) => matchesSearch(c, searchTerm) && matchesDepartamento(c, departamentoFilter),
      ),
    [approvedByYouChamados, searchTerm, departamentoFilter],
  )

  const fetchChamados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chamados')
      .select(`
        id, titulo, descricao, responsavel_id, status_aprovacao, status_aprovacao_claudinei, aprovacoes_diretoria, criado_em,
        pia, registro_motorista, nome_motorista, data_ocorrencia, status_juridico, status_sinistro,
        anexos_chamado_interno ( id, nome_arquivo, arquivo_url, criado_em ),
        documentos ( id, nome_arquivo, arquivo_url, tipo_documento, orcamento_url, valor_orcamento, registro_motorista, nome_motorista, criado_em ),
        parcelas_vales ( id, valor_parcela, data_referencia ),
        formularios_espelho_danos ( registro_motorista, nome_motorista ),
        solicitacoes_parcelamento ( id, valor_orcamento, quantidade_parcelas, status, desconto_aplicado, vale_unificado ),
        historico_chamado ( usuario_id, acao )
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

    // Buscar em lote o histórico de finalização para os chamados filtrados
    if (filtered.length > 0) {
      const chamadoIds = filtered.map((c: any) => c.id)

      // 1. Busca todos os registros de historico_chamado com acao = 'finalizado' ordenados por criado_em asc
      const { data: histData, error: histError } = await supabase
        .from('historico_chamado')
        .select('chamado_id, usuario_id, acao, criado_em')
        .in('chamado_id', chamadoIds)
        .eq('acao', 'finalizado')
        .order('criado_em', { ascending: true })

      if (!histError && histData) {
        // Mapear o último usuário que finalizou cada chamado
        const lastFinalizerPerChamado = new Map<string, string>()
        histData.forEach((h: any) => {
          if (h.usuario_id) {
            lastFinalizerPerChamado.set(h.chamado_id, h.usuario_id)
          }
        })

        // Coletar userIds a consultar em perfil_usuario
        const userIdsToFetch = new Set<string>()
        lastFinalizerPerChamado.forEach((uid) => userIdsToFetch.add(uid))

        // Para chamados que não tenham historico com acao='finalizado', olhar o responsavel_id como fallback
        filtered.forEach((c: any) => {
          if (!lastFinalizerPerChamado.has(c.id) && c.responsavel_id) {
            userIdsToFetch.add(c.responsavel_id)
          }
        })

        let profileMap = new Map<string, string>()
        if (userIdsToFetch.size > 0) {
          const { data: profiles } = await supabase
            .from('perfil_usuario')
            .select('id, departamento')
            .in('id', Array.from(userIdsToFetch))

          if (profiles) {
            profiles.forEach((p: any) => {
              if (p.id && p.departamento) {
                profileMap.set(p.id, p.departamento)
              }
            })
          }
        }

        // Anexar departamento_finalizador a cada chamado
        filtered.forEach((c: any) => {
          const finalizerUserId = lastFinalizerPerChamado.get(c.id) || c.responsavel_id
          if (finalizerUserId && profileMap.has(finalizerUserId)) {
            c.departamento_finalizador = profileMap.get(finalizerUserId)
          } else {
            c.departamento_finalizador = null
          }
        })
      }
    }

    const isApprovedByUser = (c: any) => {
      const aprovacoes = Array.isArray(c.aprovacoes_diretoria) ? c.aprovacoes_diretoria : []
      return aprovacoes.some((a: any) => a.usuario_id === user!.id && a.acao === 'aprovado')
    }

    const approved = filtered.filter(
      (c: any) => countAprovacoes(c.aprovacoes_diretoria) >= 2 && c.status_aprovacao === 'aprovado',
    )

    const approvedByYou = filtered.filter((c: any) => {
      const count = countAprovacoes(c.aprovacoes_diretoria)
      return count < 2 && isApprovedByUser(c)
    })

    const pending = filtered.filter((c: any) => {
      const count = countAprovacoes(c.aprovacoes_diretoria)
      const isApproved = count >= 2 && c.status_aprovacao === 'aprovado'
      const approvedByUser = count < 2 && isApprovedByUser(c)
      return !isApproved && !approvedByUser && (count < 2 || c.status_aprovacao !== 'aprovado')
    })

    setPendingChamados(pending)
    setApprovedByYouChamados(approvedByYou)
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
          const approvalDate = new Date()
          const approvalBaseDateStr = new Date(
            approvalDate.getFullYear(),
            approvalDate.getMonth(),
            1,
          )
            .toISOString()
            .split('T')[0]

          const { data: existingParcelas } = await supabase
            .from('parcelas_vales')
            .select('id, data_referencia, valor_parcela, is_data_referencia_fixed')
            .eq('chamado_id', selectedChamado.id)
            .eq('status', 'ativo')
            .order('data_referencia', { ascending: true })

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
                  atualizado_em: approvalDate.toISOString(),
                })
                .eq('id', selectedChamado.solicitacoes_parcelamento[0].id)
            }

            const { data: parcelasCalculadas, error: calcError } = await supabase.rpc(
              'calcular_parcelas_vale',
              {
                p_valor_base: valorFinal,
                p_quantidade_parcelas: parcelsCount,
                p_data_base: approvalBaseDateStr,
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
                aprovado_em: approvalDate.toISOString(),
                vale_unificado: valeUnificado,
              }))

              const { error: parcelasError } = await supabase
                .from('parcelas_vales')
                .insert(parcelasToInsert)
              if (parcelasError) console.error('Error creating parcelas:', parcelasError)
            }
          } else {
            // Parcelas já existem (geradas antes da aprovação da diretoria).
            // Recalcula as referências: 1ª parcela = mês da aprovação da diretoria,
            // e as seguintes em sequência mensal.
            // Marca aprovado_diretoria = true e aprovado_em = data de aprovação.
            const nowYear = approvalDate.getFullYear()
            const nowMonth = approvalDate.getMonth() // 0-indexed

            // Exceção pontual para o chamado f60a678a-f533-4135-88df-bd104fd38c1f (Carro 51019)
            // Possui 2 vales ativos: 15 parcelas (vale de R$ 3.980) e 1 parcela única de R$ 88,22 (vale de 18/06).
            // Ambos devem ter como mês inicial o mês da 2ª aprovação da diretoria.
            const CHAMADO_EXCECAO_DUPLO_VALE = 'f60a678a-f533-4135-88df-bd104fd38c1f'

            if (selectedChamado.id === CHAMADO_EXCECAO_DUPLO_VALE) {
              // Separa a parcela de R$ 88,22 (parcela única) e as parcelas do vale de R$ 3.980 (~265,33)
              const parcelaUnica88 = existingParcelas.find(
                (p: any) => Math.abs(Number(p.valor_parcela) - 88.22) < 0.01,
              )
              const parcelas3980 = existingParcelas.filter((p: any) => p.id !== parcelaUnica88?.id)

              const baseMonthDate = new Date(Date.UTC(nowYear, nowMonth, 1))
                .toISOString()
                .split('T')[0]

              // 1) Ajusta a parcela única de R$ 88,22 para o mês da aprovação
              if (parcelaUnica88) {
                await supabase
                  .from('parcelas_vales')
                  .update({
                    data_referencia: baseMonthDate,
                    aprovado_diretoria: true,
                    aprovado_em: approvalDate.toISOString(),
                  })
                  .eq('id', parcelaUnica88.id)
              }

              // 2) Ajusta as parcelas do vale de R$ 3.980 (1ª parcela no mês da aprovação, seguintes mensais)
              for (let i = 0; i < parcelas3980.length; i++) {
                const parcela = parcelas3980[i]
                const newRefDate = new Date(Date.UTC(nowYear, nowMonth + i, 1))
                  .toISOString()
                  .split('T')[0]

                await supabase
                  .from('parcelas_vales')
                  .update({
                    data_referencia: newRefDate,
                    aprovado_diretoria: true,
                    aprovado_em: approvalDate.toISOString(),
                  })
                  .eq('id', parcela.id)
              }
            } else {
              // Comportamento padrão para todos os outros chamados
              for (let i = 0; i < existingParcelas.length; i++) {
                const parcela = existingParcelas[i]
                const newRefDate = new Date(Date.UTC(nowYear, nowMonth + i, 1))
                  .toISOString()
                  .split('T')[0]

                await supabase
                  .from('parcelas_vales')
                  .update({
                    data_referencia: newRefDate,
                    aprovado_diretoria: true,
                    aprovado_em: approvalDate.toISOString(),
                  })
                  .eq('id', parcela.id)
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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Input
          placeholder="Buscar por carro, OS, PIA, registro ou nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xl flex-1"
        />

        <div className="w-full sm:w-[200px]">
          <Select
            value={departamentoFilter}
            onValueChange={(val: 'todos' | 'juridico' | 'sinistro') => setDepartamentoFilter(val)}
          >
            <SelectTrigger className="w-full bg-white shadow-sm">
              <SelectValue placeholder="Filtrar departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="juridico">Jurídico</SelectItem>
              <SelectItem value="sinistro">Sinistro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="pendentes">
            Pendentes de Aprovação
            <span className="ml-2 text-xs rounded-full bg-muted px-2 py-0.5">
              {filteredPendingChamados.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="aprovados-por-voce">
            Aprovados por você
            <span className="ml-2 text-xs rounded-full bg-muted px-2 py-0.5">
              {filteredApprovedByYouChamados.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="aprovados">
            Aprovados (2/2)
            <span className="ml-2 text-xs rounded-full bg-muted px-2 py-0.5">
              {filteredApprovedChamados.length}
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
                  chamados={filteredPendingChamados}
                  userId={user!.id}
                  showActions
                  onApproveClick={handleApproveClick}
                  onRejectClick={handleRejectClick}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aprovados-por-voce">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ValesAprovacaoTable
                  chamados={filteredApprovedByYouChamados}
                  userId={user!.id}
                  showActions={false}
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
                  chamados={filteredApprovedChamados}
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
