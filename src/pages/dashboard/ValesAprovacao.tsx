import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
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
import { Check, X, FileText, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function ValesAprovacao() {
  const { user, profile } = useAuth()
  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [selectedChamado, setSelectedChamado] = useState<any>(null)
  const [valorTotal, setValorTotal] = useState('')
  const [numeroParcelas, setNumeroParcelas] = useState('1')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchChamados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chamados')
      .select(`
        id, titulo, descricao, status_aprovacao, aprovacoes_diretoria,
        anexos_chamado_interno ( id, nome_arquivo, arquivo_url ),
        parcelas_vales ( id, valor_parcela, data_referencia )
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
        const hasVale = anexos.some((a: any) => a.nome_arquivo.toLowerCase().includes('vale'))
        const hasOrcamento = anexos.some(
          (a: any) =>
            a.nome_arquivo.toLowerCase().includes('orçamento') ||
            a.nome_arquivo.toLowerCase().includes('orcamento'),
        )
        return hasVale && hasOrcamento
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
    const currentAprovacoes = Array.isArray(chamado.aprovacoes_diretoria)
      ? chamado.aprovacoes_diretoria
      : []
    const isSecondApproval =
      currentAprovacoes.length >= 1 || chamado.status_aprovacao === 'aprovacao_parcial'

    if (isSecondApproval) {
      const parcelas = chamado.parcelas_vales || []
      const total = parcelas.reduce((acc: number, p: any) => acc + Number(p.valor_parcela), 0)
      setValorTotal(total.toFixed(2))
      setNumeroParcelas(parcelas.length.toString())
    } else {
      setValorTotal('')
      setNumeroParcelas('1')
    }
    setIsApproveOpen(true)
  }

  const handleApproveSubmit = async () => {
    if (!selectedChamado) return
    setIsSubmitting(true)

    const currentAprovacoes = Array.isArray(selectedChamado.aprovacoes_diretoria)
      ? selectedChamado.aprovacoes_diretoria
      : []
    const isSecondApproval =
      currentAprovacoes.length >= 1 || selectedChamado.status_aprovacao === 'aprovacao_parcial'

    const newAprovacoes = [
      ...currentAprovacoes,
      {
        usuario_id: user!.id,
        nome_diretor: profile?.nome_completo || 'Diretor',
        aprovado: true,
        data_aprovacao: new Date().toISOString(),
      },
    ]

    const isFinalApproval = newAprovacoes.length >= 2
    const newStatus = isFinalApproval ? 'aprovado' : 'aprovacao_parcial'

    if (!isSecondApproval) {
      const total = parseFloat(valorTotal.replace(',', '.'))
      const parcelasCount = parseInt(numeroParcelas, 10)

      if (isNaN(total) || total <= 0) {
        toast.error('Valor total inválido')
        setIsSubmitting(false)
        return
      }
      if (isNaN(parcelasCount) || parcelasCount <= 0) {
        toast.error('Número de parcelas inválido')
        setIsSubmitting(false)
        return
      }

      const valorParcela = Math.floor((total / parcelasCount) * 100) / 100
      const parcelas = []
      let currentDate = new Date()
      currentDate.setMonth(currentDate.getMonth() + 1)
      currentDate.setDate(1)

      for (let i = 0; i < parcelasCount; i++) {
        const isLast = i === parcelasCount - 1
        const parcelaValue = isLast
          ? (total - valorParcela * (parcelasCount - 1)).toFixed(2)
          : valorParcela.toFixed(2)

        parcelas.push({
          chamado_id: selectedChamado.id,
          valor_parcela: parcelaValue,
          data_referencia: currentDate.toISOString().split('T')[0],
        })
        currentDate.setMonth(currentDate.getMonth() + 1)
      }

      const { error: parcelasError } = await supabase.from('parcelas_vales').insert(parcelas)
      if (parcelasError) {
        toast.error('Erro ao gerar parcelas')
        setIsSubmitting(false)
        return
      }
    }

    const { error } = await supabase
      .from('chamados')
      .update({
        status_aprovacao: newStatus,
        aprovacoes_diretoria: newAprovacoes,
      } as any)
      .eq('id', selectedChamado.id)

    if (error) {
      toast.error('Erro ao aprovar chamado')
      setIsSubmitting(false)
      return
    }

    await supabase.from('historico_chamado').insert({
      chamado_id: selectedChamado.id,
      acao: 'respondido',
      usuario_id: user!.id,
      detalhes: isFinalApproval
        ? `Vale aprovado integralmente pela Diretoria.`
        : `Vale pré-aprovado pela Diretoria (1/2). Total: R$ ${valorTotal} em ${numeroParcelas}x. Aguardando segunda aprovação.`,
    })

    toast.success(
      isFinalApproval ? 'Chamado aprovado com sucesso!' : 'Aprovação parcial registrada!',
    )
    setChamados((prev) => prev.filter((c) => c.id !== selectedChamado.id))
    setIsApproveOpen(false)
    setIsSubmitting(false)
  }

  const handleRefuse = async (chamado: any) => {
    const { error } = await supabase
      .from('chamados')
      .update({ status_aprovacao: 'recusado' } as any)
      .eq('id', chamado.id)

    if (error) {
      toast.error('Erro ao recusar chamado')
      return
    }

    await supabase.from('historico_chamado').insert({
      chamado_id: chamado.id,
      acao: 'respondido',
      usuario_id: user!.id,
      detalhes: 'Recusado pela Diretoria',
    })

    toast.success('Chamado recusado!')
    setChamados((prev) => prev.filter((c) => c.id !== chamado.id))
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (profile?.departamento !== 'Diretoria') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
        <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
        <h2 className="text-xl font-medium">Acesso Restrito</h2>
        <p>Apenas membros da Diretoria podem acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Vales para aprovação</h1>
        <p className="text-sm text-slate-500 mt-1">
          Revise e aprove os vales dos chamados finalizados. É necessária a aprovação de 2
          diretores.
        </p>
      </div>

      {chamados.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center h-48 text-center pt-6">
            <Check className="h-12 w-12 text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">
              Nenhum vale pendente de aprovação para você no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {chamados.map((chamado) => {
            const anexos = chamado.anexos_chamado_interno || []
            const vales = anexos.filter((a: any) => a.nome_arquivo.toLowerCase().includes('vale'))
            const orcamentos = anexos.filter(
              (a: any) =>
                a.nome_arquivo.toLowerCase().includes('orçamento') ||
                a.nome_arquivo.toLowerCase().includes('orcamento'),
            )
            const currentAprovacoes = Array.isArray(chamado.aprovacoes_diretoria)
              ? chamado.aprovacoes_diretoria
              : []
            const isSecondApproval =
              currentAprovacoes.length >= 1 || chamado.status_aprovacao === 'aprovacao_parcial'

            return (
              <Card
                key={chamado.id}
                className="shadow-sm border-slate-200 overflow-hidden transition-all hover:shadow-md"
              >
                <CardHeader className="bg-slate-50/50 border-b pb-4">
                  <CardTitle className="text-lg text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {chamado.titulo}
                      {isSecondApproval && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                          1/2 Aprovações
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-normal text-slate-500 bg-white px-2 py-1 rounded-full border">
                      #{chamado.id.split('-')[0].toUpperCase()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg whitespace-pre-wrap">
                    {chamado.descricao}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {vales.map((v: any) => (
                      <a
                        key={v.id}
                        href={v.arquivo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-100"
                      >
                        <FileText className="w-4 h-4" />
                        Ver Vale
                      </a>
                    ))}
                    {orcamentos.map((o: any) => (
                      <a
                        key={o.id}
                        href={o.arquivo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-md text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-100"
                      >
                        <FileText className="w-4 h-4" />
                        Ver Orçamento
                      </a>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-3 justify-end border-t bg-slate-50 py-3">
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => handleRefuse(chamado)}
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    Recusar
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApproveClick(chamado)}
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    {isSecondApproval ? 'Confirmar 2ª Aprovação' : 'Aprovar'}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {(Array.isArray(selectedChamado?.aprovacoes_diretoria) &&
                selectedChamado.aprovacoes_diretoria.length >= 1) ||
              selectedChamado?.status_aprovacao === 'aprovacao_parcial'
                ? 'Confirmar 2ª Aprovação'
                : 'Aprovar Vale'}
            </DialogTitle>
            <DialogDescription>
              {(Array.isArray(selectedChamado?.aprovacoes_diretoria) &&
                selectedChamado.aprovacoes_diretoria.length >= 1) ||
              selectedChamado?.status_aprovacao === 'aprovacao_parcial'
                ? 'A primeira aprovação já foi registrada com os valores abaixo. Confirme para finalizar a aprovação e enviar ao DP.'
                : 'Insira o valor total e em quantas parcelas o valor será descontado.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valorTotal" className="text-right">
                Valor Total (R$)
              </Label>
              <Input
                id="valorTotal"
                type="number"
                step="0.01"
                placeholder="Ex: 900.00"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                className="col-span-3 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={
                  (Array.isArray(selectedChamado?.aprovacoes_diretoria) &&
                    selectedChamado.aprovacoes_diretoria.length >= 1) ||
                  selectedChamado?.status_aprovacao === 'aprovacao_parcial'
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="parcelas" className="text-right">
                Nº de Parcelas
              </Label>
              <Input
                id="parcelas"
                type="number"
                min="1"
                step="1"
                value={numeroParcelas}
                onChange={(e) => setNumeroParcelas(e.target.value)}
                className="col-span-3 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={
                  (Array.isArray(selectedChamado?.aprovacoes_diretoria) &&
                    selectedChamado.aprovacoes_diretoria.length >= 1) ||
                  selectedChamado?.status_aprovacao === 'aprovacao_parcial'
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApproveSubmit}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Confirmar e Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
