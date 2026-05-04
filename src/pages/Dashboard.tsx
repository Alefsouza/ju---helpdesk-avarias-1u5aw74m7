import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Ticket, Clock, CheckCircle2 } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()

  const stats = [
    {
      title: 'Chamados Abertos',
      value: '12',
      icon: Ticket,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Em Andamento',
      value: '4',
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      title: 'Resolvidos',
      value: '128',
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
  ]

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-2">
          Bem-vindo ao Helpdesk, <span className="font-medium text-slate-700">{user?.email}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card
              key={index}
              className="border-slate-200 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-full ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card
        className="border-slate-200 shadow-sm mt-6 animate-fade-in-up"
        style={{ animationDelay: '300ms' }}
      >
        <CardHeader>
          <CardTitle className="text-lg">Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500 text-center py-12 flex flex-col items-center justify-center gap-3">
            <Ticket className="h-8 w-8 text-slate-300" />
            <p>Nenhum chamado recente encontrado para sua conta.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
