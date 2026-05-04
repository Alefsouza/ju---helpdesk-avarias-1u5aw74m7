import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Ticket, Activity, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DashboardCards({ chamados }: { chamados: any[] }) {
  const total = chamados.length
  const abertos = chamados.filter((c) => c.status === 'aberto').length
  const emAtendimento = chamados.filter((c) => c.status === 'em_atendimento').length
  const finalizados = chamados.filter((c) => c.status === 'finalizado').length

  const renderTrend = (up: boolean, val: string) => (
    <div
      className={cn(
        'flex items-center text-xs mt-1 font-medium',
        up ? 'text-emerald-600' : 'text-red-600',
      )}
    >
      {up ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
      <span>{val} em relação ao mês anterior</span>
    </div>
  )

  const cards = [
    { title: 'Total de Chamados', value: total, icon: Ticket, up: true, trend: '+12%' },
    { title: 'Chamados Abertos', value: abertos, icon: Activity, up: false, trend: '-5%' },
    { title: 'Em Atendimento', value: emAtendimento, icon: Clock, up: true, trend: '+18%' },
    {
      title: 'Chamados Finalizados',
      value: finalizados,
      icon: CheckCircle,
      up: true,
      trend: '+24%',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={i} className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-emerald-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-800">{card.value}</div>
            {renderTrend(card.up, card.trend)}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
