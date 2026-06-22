import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export default function AutorizarParcelas() {
  const { user, profile } = useAuth()
  const [solicitacoes, setSolicitacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [descontos, setDescontos] = useState<Record<string, boolean>>({})

  const fetchSolicitacoes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('solicitacoes_parcelamento')
      .select('*, chamados(titulo, id)')
      .eq('status', 'pendente')
      .order('criado_em', { ascending: false })

    if (error) {
      toast.error('Erro ao buscar solicitações')
    } else {
      setSolicitacoes(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user?.email === 'alex.fontes@viasudeste.com') {
      fetchSolicitacoes()
    } else {
      setLoading(false)
    }
  }, [user])

  const handleAction = async (id: string, newStatus: string) => {
    setActionLoading(id)

    const updatePayload: any = {
      status: newStatus,
      atualizado_em: new Date().toISOString(),
    }

    if (newStatus === 'aprovado') {
      updatePayload.desconto_aplicado = descontos[id] || false
    }

    const { error } = await supabase
      .from('solicitacoes_parcelamento')
      .update(updatePayload)
      .eq('id', id)

    if (error) {
      toast.error('Erro ao atualizar solicitação')
      setActionLoading(null)
      return
    }

    toast.success(`Solicitação ${newStatus === 'aprovado' ? 'aprovada' : 'recusada'}!`)
    setSolicitacoes((prev) => prev.filter((s) => s.id !== id))
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (user?.email !== 'alex.fontes@viasudeste.com') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
        <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
        <h2 className="text-xl font-medium">Acesso Restrito</h2>
        <p>Apenas o gestor autorizado pode acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Autorizar Parcelas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Revise e aprove as solicitações de parcelamento de descontos.
        </p>
      </div>

      {solicitacoes.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center h-48 text-center pt-6">
            <Check className="h-12 w-12 text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">Nenhuma solicitação pendente no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {solicitacoes.map((s) => (
            <Card key={s.id} className="shadow-sm">
              <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <Link
                    to={`/dashboard/chamados/${s.chamados?.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {s.chamados?.titulo}
                  </Link>
                  <div className="text-sm text-slate-600 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <span className="font-medium">Colaborador:</span> {s.nome}
                    </div>
                    <div>
                      <span className="font-medium">Registro:</span> {s.registro}
                    </div>
                    <div>
                      <span className="font-medium">Valor:</span>{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(s.valor_orcamento)}
                    </div>
                    <div>
                      <span className="font-medium">Parcelas:</span> {s.quantidade_parcelas}x
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`desconto-${s.id}`}
                      checked={descontos[s.id] || false}
                      onCheckedChange={(c) => setDescontos((prev) => ({ ...prev, [s.id]: !!c }))}
                      disabled={actionLoading === s.id}
                    />
                    <Label
                      htmlFor={`desconto-${s.id}`}
                      className="text-sm cursor-pointer whitespace-nowrap"
                    >
                      Aplicar desconto de 10%
                    </Label>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => handleAction(s.id, 'recusado')}
                      disabled={actionLoading === s.id}
                    >
                      {actionLoading === s.id ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <X className="w-4 h-4 mr-1.5" />
                      )}{' '}
                      Recusar
                    </Button>
                    <Button
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleAction(s.id, 'aprovado')}
                      disabled={actionLoading === s.id}
                    >
                      {actionLoading === s.id ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-1.5" />
                      )}{' '}
                      Aprovar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
