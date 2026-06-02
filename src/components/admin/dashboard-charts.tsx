import { useMemo } from 'react'
import {
  Pie,
  PieChart,
  Cell,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { FilterX } from 'lucide-react'

const statusColors = {
  aberto: '#225f3d', // verde escuro
  em_atendimento: '#c8e6c9', // verde claro
  finalizado: '#808080', // cinza médio
}

const priorityColors = {
  media: '#c8e6c9', // verde claro
  urgente: '#ef4444', // vermelho
}

export function DashboardCharts({
  chamados,
  chartFilters,
  onChartClick,
  onClearFilters,
}: {
  chamados: any[]
  chartFilters: { status?: string; prioridade?: string; garagem?: string; responsavel?: string }
  onChartClick: (type: 'status' | 'prioridade' | 'garagem' | 'responsavel', value: string) => void
  onClearFilters: () => void
}) {
  const statusData = [
    {
      id: 'aberto',
      name: 'Aberto',
      value: chamados.filter((c) => c.status === 'aberto').length,
      fill: statusColors.aberto,
    },
    {
      id: 'em_atendimento',
      name: 'Em Atendimento',
      value: chamados.filter((c) => c.status === 'em_atendimento').length,
      fill: statusColors.em_atendimento,
    },
    {
      id: 'finalizado',
      name: 'Finalizado',
      value: chamados.filter((c) => c.status === 'finalizado').length,
      fill: statusColors.finalizado,
    },
  ]

  const prioData = [
    {
      id: 'media',
      name: 'Média',
      value: chamados.filter((c) => c.prioridade === 'media').length,
      fill: priorityColors.media,
    },
    {
      id: 'urgente',
      name: 'Urgente',
      value: chamados.filter((c) => c.prioridade === 'urgente').length,
      fill: priorityColors.urgente,
    },
  ]

  const garageData = useMemo(() => {
    const counts: Record<string, number> = {}
    chamados.forEach((c) => {
      const g = c.garagem || 'Não Informada'
      counts[g] = (counts[g] || 0) + 1
    })
    const colors = [
      '#225f3d',
      '#c8e6c9',
      '#4caf50',
      '#81c784',
      '#a5d6a7',
      '#66bb6a',
      '#388e3c',
      '#2e7d32',
      '#1b5e20',
    ]
    return Object.entries(counts)
      .map(([name, value], idx) => ({ id: name, name, value, fill: colors[idx % colors.length] }))
      .sort((a, b) => b.value - a.value)
  }, [chamados])

  const respData = useMemo(() => {
    const counts: Record<string, { name: string; value: number; id: string }> = {}
    chamados.forEach((c) => {
      const respId = c.responsavel?.id || 'unassigned'
      const respName = c.responsavel?.nome_completo || 'Sem Responsável'
      if (!counts[respId]) {
        counts[respId] = { id: respId, name: respName, value: 0 }
      }
      counts[respId].value += 1
    })
    return Object.values(counts)
      .sort((a, b) => b.value - a.value)
      .map((d) => ({ ...d, fill: '#225f3d' }))
  }, [chamados])

  const statusConfig = {
    aberto: { label: 'Aberto', color: statusColors.aberto },
    em_atendimento: { label: 'Em Atendimento', color: statusColors.em_atendimento },
    finalizado: { label: 'Finalizado', color: statusColors.finalizado },
  }

  const prioConfig = {
    media: { label: 'Média', color: priorityColors.media },
    urgente: { label: 'Urgente', color: priorityColors.urgente },
  }

  const hasActiveFilters = Object.values(chartFilters).some(Boolean)

  const formatFilterValue = (type: string, value: string) => {
    if (type === 'responsavel' && value === 'unassigned') return 'Sem Responsável'
    if (type === 'responsavel') return respData.find((r) => r.id === value)?.name || value
    if (type === 'prioridade') return value === 'media' ? 'Média' : 'Urgente'
    if (type === 'status') {
      if (value === 'aberto') return 'Aberto'
      if (value === 'em_atendimento') return 'Em Atendimento'
      if (value === 'finalizado') return 'Finalizado'
    }
    return value
  }

  return (
    <div className="space-y-4 mb-6">
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Filtros ativos:</span>
            {Object.entries(chartFilters).map(([key, value]) => {
              if (!value) return null
              return (
                <div
                  key={key}
                  className="bg-[#225f3d]/10 text-[#225f3d] px-2.5 py-1 rounded-full text-xs font-medium border border-[#225f3d]/20"
                >
                  {key === 'status'
                    ? 'Status: '
                    : key === 'prioridade'
                      ? 'Prioridade: '
                      : key === 'garagem'
                        ? 'Garagem: '
                        : 'Resp: '}
                  {formatFilterValue(key, value as string)}
                </div>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-slate-600 border-slate-300 hover:bg-slate-100 shrink-0"
          >
            <FilterX className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[24px] font-semibold text-[#225f3d]">
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        className="shadow-[0px_0px_6px_0px_#000000] border-[inherit] cursor-pointer transition-opacity duration-200"
                        key={index}
                        fill={entry.fill}
                        onClick={() => onChartClick('status', entry.id)}
                        style={{
                          opacity:
                            chartFilters.status && chartFilters.status !== entry.id ? 0.3 : 1,
                        }}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#212121', fontSize: '12px', fontWeight: 500 }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[24px] font-semibold text-[#225f3d]">
              Chamados por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={prioConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prioData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#212121' }}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#212121' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {prioData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.fill}
                        className="cursor-pointer transition-opacity duration-200"
                        onClick={() => onChartClick('prioridade', entry.id)}
                        style={{
                          opacity:
                            chartFilters.prioridade && chartFilters.prioridade !== entry.id
                              ? 0.3
                              : 1,
                        }}
                      />
                    ))}
                  </Bar>
                  <Legend
                    formatter={() => (
                      <span style={{ color: '#212121', fontSize: '12px', fontWeight: 500 }}>
                        Quantidade
                      </span>
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[24px] font-semibold text-[#225f3d]">
              Distribuição por Garagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ garagem: { label: 'Garagem', color: '#225f3d' } }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={garageData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {garageData.map((entry, index) => (
                      <Cell
                        className="shadow-[0px_0px_6px_0px_#000000] border-[inherit] cursor-pointer transition-opacity duration-200"
                        key={index}
                        fill={entry.fill}
                        onClick={() => onChartClick('garagem', entry.id)}
                        style={{
                          opacity:
                            chartFilters.garagem && chartFilters.garagem !== entry.id ? 0.3 : 1,
                        }}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#212121', fontSize: '12px', fontWeight: 500 }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[24px] font-semibold text-[#225f3d]">
              Chamados por Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ responsavel: { label: 'Responsável', color: '#225f3d' } }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={respData}
                  layout="vertical"
                  margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                >
                  <XAxis
                    type="number"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#212121' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#212121' }}
                    width={90}
                    tickFormatter={(value) =>
                      value.length > 12 ? value.substring(0, 10) + '...' : value
                    }
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
                    {respData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.fill}
                        className="cursor-pointer transition-opacity duration-200"
                        onClick={() => onChartClick('responsavel', entry.id)}
                        style={{
                          opacity:
                            chartFilters.responsavel && chartFilters.responsavel !== entry.id
                              ? 0.3
                              : 1,
                        }}
                      />
                    ))}
                  </Bar>
                  <Legend
                    formatter={() => (
                      <span style={{ color: '#212121', fontSize: '12px', fontWeight: 500 }}>
                        Quantidade
                      </span>
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
