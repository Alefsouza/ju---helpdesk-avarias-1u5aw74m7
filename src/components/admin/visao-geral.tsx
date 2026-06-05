import { useState } from 'react'
import { useChamadosDashboard } from '@/hooks/use-chamados-dashboard'
import { DashboardCards } from './dashboard-cards'
import { DashboardCharts } from './dashboard-charts'
import { DashboardTable } from './dashboard-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export function VisaoGeral() {
  const { chamados, responsaveis, loading, error, refetch } = useChamadosDashboard()

  const [chartFilters, setChartFilters] = useState<{
    status?: string
    prioridade?: string
    garagem?: string
    responsavel?: string
    data?: string
  }>({})

  const handleChartClick = (
    type: 'status' | 'prioridade' | 'garagem' | 'responsavel' | 'data',
    value: string,
  ) => {
    setChartFilters((prev) => ({
      ...prev,
      [type]: prev[type] === value ? undefined : value,
    }))
  }

  const handleClearFilters = () => {
    setChartFilters({})
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[380px]" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-slate-50">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Erro ao carregar dashboard</h2>
        <p className="text-slate-500 mb-4 text-sm">
          Ocorreu um problema ao conectar com o banco de dados.
        </p>
        <Button onClick={refetch}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardCards chamados={chamados} chartFilters={chartFilters} />
      <DashboardCharts
        chamados={chamados}
        chartFilters={chartFilters}
        onChartClick={handleChartClick}
        onClearFilters={handleClearFilters}
      />
      <DashboardTable chamados={chamados} responsaveis={responsaveis} chartFilters={chartFilters} />
    </div>
  )
}
