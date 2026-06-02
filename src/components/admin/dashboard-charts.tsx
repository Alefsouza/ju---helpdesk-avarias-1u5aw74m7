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
  chartFilters: { status?: string; prioridade?: string; garagem?: string }
  onChartClick: (type: 'status' | 'prioridade' | 'garagem', value: string) => void
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
    return Object.entries(counts)
      .map(([name, value]) => ({ id: name, name, value, fill: '#225f3d' }))
      .sort((a, b) => b.value - a.value)
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

  return (
    <div className="space-y-4 mb-6">
      {hasActiveFilters && (
        <div className="flex justify-end animate-fade-in">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-slate-600 border-slate-300 hover:bg-slate-100"
          >
            <FilterX className="h-4 w-4 mr-2" />
            Limpar Filtros dos Gráficos
          </Button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              Chamados por Garagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ garagem: { label: 'Garagem', color: '#225f3d' } }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={garageData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#212121' }}
                    tickFormatter={(value) =>
                      value.length > 10 ? value.substring(0, 10) + '...' : value
                    }
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#212121' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {garageData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.fill}
                        className="cursor-pointer transition-opacity duration-200"
                        onClick={() => onChartClick('garagem', entry.id)}
                        style={{
                          opacity:
                            chartFilters.garagem && chartFilters.garagem !== entry.id ? 0.3 : 1,
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
