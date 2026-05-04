import { Pie, PieChart, Cell, Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const statusColors = {
  aberto: '#166534',
  em_atendimento: '#22c55e',
  finalizado: '#9ca3af',
}

const priorityColors = {
  baixa: '#9ca3af',
  media: '#f97316',
  alta: '#ef4444',
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
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-slate-700">
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
                  paddingAngle={5}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-slate-700">
            Chamados por Prioridade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={prioConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prioData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {prioData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
