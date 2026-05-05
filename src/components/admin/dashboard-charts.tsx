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

const statusColors = {
  aberto: '#225f3d', // verde escuro
  em_atendimento: '#c8e6c9', // verde claro
  finalizado: '#404040', // cinza escuro
}

const priorityColors = {
  baixa: '#404040', // cinza escuro
  media: '#c8e6c9', // verde claro
  alta: '#225f3d', // verde escuro
}

export function DashboardCharts({ chamados }: { chamados: any[] }) {
  const statusData = [
    {
      name: 'Aberto',
      value: chamados.filter((c) => c.status === 'aberto').length,
      fill: statusColors.aberto,
    },
    {
      name: 'Em Atendimento',
      value: chamados.filter((c) => c.status === 'em_atendimento').length,
      fill: statusColors.em_atendimento,
    },
    {
      name: 'Finalizado',
      value: chamados.filter((c) => c.status === 'finalizado').length,
      fill: statusColors.finalizado,
    },
  ]

  const prioData = [
    {
      name: 'Baixa',
      value: chamados.filter((c) => c.prioridade === 'baixa').length,
      fill: priorityColors.baixa,
    },
    {
      name: 'Média',
      value: chamados.filter((c) => c.prioridade === 'media').length,
      fill: priorityColors.media,
    },
    {
      name: 'Alta',
      value: chamados.filter((c) => c.prioridade === 'alta').length,
      fill: priorityColors.alta,
    },
  ]

  const statusConfig = {
    aberto: { label: 'Aberto', color: statusColors.aberto },
    em_atendimento: { label: 'Em Atendimento', color: statusColors.em_atendimento },
    finalizado: { label: 'Finalizado', color: statusColors.finalizado },
  }

  const prioConfig = {
    baixa: { label: 'Baixa', color: priorityColors.baixa },
    media: { label: 'Média', color: priorityColors.media },
    alta: { label: 'Alta', color: priorityColors.alta },
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-6">
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
                      className="shadow-[0px_0px_6px_0px_#000000] border-[inherit]"
                      key={index}
                      fill={entry.fill}
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
                <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#212121' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {prioData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
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
  )
}
