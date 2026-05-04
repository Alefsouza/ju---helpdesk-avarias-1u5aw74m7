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
        'flex items-center text-[12px] mt-1 font-medium',
        up ? 'text-[#225f3d]' : 'text-slate-400',
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {cards.map((card, i) => (
        <Card
          key={i}
          className="border-[#f0f0f0] bg-white transition-all duration-200 hover:shadow-subtle"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-6 pt-6">
            <CardTitle className="text-[14px] font-medium text-[#212121]">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-[#225f3d]" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-[32px] font-bold text-[#225f3d] leading-none mb-1">
              {card.value}
            </div>
            {renderTrend(card.up, card.trend)}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
