import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Ticket,
  Activity,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  GitMerge,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { subDays, isAfter, isBefore } from 'date-fns'

import { useMemo } from 'react'

export function DashboardCards({
  chamados,
  chartFilters,
}: {
  chamados: any[]
  chartFilters?: {
    status?: string
    prioridade?: string
    garagem?: string
    responsavel?: string
    data?: string
  }
}) {
  const filtered = useMemo(() => {
    if (!chartFilters) return chamados
    return chamados.filter((c) => {
      if (chartFilters.data && (!c.criado_em || !c.criado_em.startsWith(chartFilters.data)))
        return false
      if (chartFilters.status && c.status !== chartFilters.status) return false
      if (chartFilters.prioridade && c.prioridade !== chartFilters.prioridade) return false
      if (chartFilters.garagem && (c.garagem || 'Não Informada') !== chartFilters.garagem)
        return false
      if (chartFilters.responsavel) {
        const respId = c.responsavel?.id || 'unassigned'
        if (respId !== chartFilters.responsavel) return false
      }
      return true
    })
  }, [chamados, chartFilters])

  const total = filtered.length
  const abertos = filtered.filter((c) => c.status === 'aberto').length
  const emAtendimento = filtered.filter((c) => c.status === 'em_atendimento').length
  const finalizados = filtered.filter((c) => c.status === 'finalizado').length
  const unificados = filtered.filter((c) => c.status === 'unificado').length

  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)
  const sixtyDaysAgo = subDays(now, 60)

  const calcTrend = (status?: string) => {
    const current = filtered.filter(
      (c) => isAfter(new Date(c.criado_em), thirtyDaysAgo) && (status ? c.status === status : true),
    ).length
    const previous = filtered.filter(
      (c) =>
        isAfter(new Date(c.criado_em), sixtyDaysAgo) &&
        isBefore(new Date(c.criado_em), thirtyDaysAgo) &&
        (status ? c.status === status : true),
    ).length

    if (previous === 0) return current > 0 ? { up: true, val: '+100%' } : { up: null, val: '0%' }
    const percent = Math.round(((current - previous) / previous) * 100)
    return { up: percent > 0, val: `${percent > 0 ? '+' : ''}${percent}%` }
  }

  const trends = {
    total: calcTrend(),
    abertos: calcTrend('aberto'),
    emAtendimento: calcTrend('em_atendimento'),
    finalizados: calcTrend('finalizado'),
    unificados: calcTrend('unificado'),
  }

  const renderTrend = (up: boolean | null, val: string) => (
    <div
      className={cn(
        'flex items-center text-[12px] mt-1 font-medium',
        up === true ? 'text-[#225f3d]' : 'text-slate-400',
      )}
    >
      {up === true ? (
        <TrendingUp className="h-3 w-3 mr-1" />
      ) : up === false ? (
        <TrendingDown className="h-3 w-3 mr-1" />
      ) : (
        <Minus className="h-3 w-3 mr-1" />
      )}
      <span>{val} em relação ao mês anterior</span>
    </div>
  )

  const cards = [
    {
      title: 'Total de Chamados',
      value: total,
      icon: Ticket,
      up: trends.total.up,
      trend: trends.total.val,
    },
    {
      title: 'Chamados Abertos',
      value: abertos,
      icon: Activity,
      up: trends.abertos.up,
      trend: trends.abertos.val,
    },
    {
      title: 'Em Atendimento',
      value: emAtendimento,
      icon: Clock,
      up: trends.emAtendimento.up,
      trend: trends.emAtendimento.val,
    },
    {
      title: 'Chamados Finalizados',
      value: finalizados,
      icon: CheckCircle,
      up: trends.finalizados.up,
      trend: trends.finalizados.val,
    },
    {
      title: 'Chamados Unificados',
      value: unificados,
      icon: GitMerge,
      up: trends.unificados.up,
      trend: trends.unificados.val,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
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
