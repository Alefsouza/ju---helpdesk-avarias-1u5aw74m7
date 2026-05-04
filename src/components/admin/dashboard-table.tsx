import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Search, FilterX, ExternalLink, CalendarIcon } from 'lucide-react'
import { format, isAfter, isBefore, subDays, startOfDay, endOfDay } from 'date-fns'
import { cn } from '@/lib/utils'

export function DashboardTable({
  chamados,
  responsaveis,
}: {
  chamados: any[]
  responsaveis: any[]
}) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [period, setPeriod] = useState('all')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>()
  const [status, setStatus] = useState('all')
  const [prioridade, setPrioridade] = useState('all')
  const [resp, setResp] = useState('all')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const filtered = useMemo(() => {
    return chamados.filter((c) => {
      if (
        debouncedSearch &&
        !c.id.includes(debouncedSearch) &&
        !c.titulo.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
        return false
      if (status !== 'all' && c.status !== status) return false
      if (prioridade !== 'all' && c.prioridade !== prioridade) return false
      if (resp !== 'all') {
        if (resp === 'unassigned' && c.responsavel) return false
        if (resp !== 'unassigned' && c.responsavel?.id !== resp) return false
      }
      if (period !== 'all' && period !== 'custom') {
        const days = parseInt(period)
        if (days && isAfter(subDays(new Date(), days), new Date(c.criado_em))) return false
      }
      if (period === 'custom' && dateRange?.from) {
        const d = new Date(c.criado_em)
        if (isBefore(d, startOfDay(dateRange.from))) return false
        if (dateRange.to && isAfter(d, endOfDay(dateRange.to))) return false
      }
      return true
    })
  }, [chamados, debouncedSearch, status, prioridade, resp, period, dateRange])

  const statusColor: Record<string, string> = {
    aberto: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    em_atendimento: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    finalizado: 'bg-green-100 text-green-800 hover:bg-green-100',
  }

  const prioColor: Record<string, string> = {
    baixa: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    media: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    alta: 'bg-red-100 text-red-800 hover:bg-red-100',
  }

  const statusLabel: Record<string, string> = {
    aberto: 'Aberto',
    em_atendimento: 'Em Atendimento',
    finalizado: 'Finalizado',
  }
  const prioLabel: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setPrioridade('all')
    setResp('all')
    setPeriod('all')
    setDateRange(undefined)
  }

  return (
    <Card className="flex-1 shadow-sm border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle">
      <CardContent className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 bg-[#f0f0f0] border-[#f0f0f0] text-[#212121] placeholder:text-slate-500"
              placeholder="Buscar ID ou Título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="bg-[#f0f0f0] border-[#f0f0f0] text-[#212121] flex-1">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal bg-[#f0f0f0] border-[#f0f0f0] text-[#212121] flex-1 px-3',
                      !dateRange && 'text-slate-500',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <span className="text-xs truncate">
                          {format(dateRange.from, 'dd/MM/yy')} - {format(dateRange.to, 'dd/MM/yy')}
                        </span>
                      ) : (
                        <span className="text-xs">{format(dateRange.from, 'dd/MM/yy')}</span>
                      )
                    ) : (
                      <span className="text-xs">Selecione...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-[#f0f0f0] border-[#f0f0f0] text-[#212121]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={prioridade} onValueChange={setPrioridade}>
            <SelectTrigger className="bg-[#f0f0f0] border-[#f0f0f0] text-[#212121]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Prioridades</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resp} onValueChange={setResp}>
            <SelectTrigger className="bg-[#f0f0f0] border-[#f0f0f0] text-[#212121]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Responsáveis</SelectItem>
              <SelectItem value="unassigned">Sem Responsável</SelectItem>
              {responsaveis.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border-[#f0f0f0] rounded-lg border-dashed">
            <FilterX className="h-10 w-10 text-slate-400 mb-3" />
            <h3 className="text-lg font-medium">Nenhum chamado encontrado</h3>
            <p className="text-slate-500 mb-4 text-sm">
              Tente ajustar ou remover os filtros aplicados.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-md border border-[#f0f0f0] overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#c8e6c9] hover:bg-[#c8e6c9]/90 border-[#f0f0f0]">
                    <TableHead className="w-[100px] text-[#225f3d] font-semibold text-[14px]">
                      ID
                    </TableHead>
                    <TableHead className="text-[#225f3d] font-semibold text-[14px]">
                      Título
                    </TableHead>
                    <TableHead className="text-[#225f3d] font-semibold text-[14px]">
                      Status
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-[#225f3d] font-semibold text-[14px]">
                      Prioridade
                    </TableHead>
                    <TableHead className="text-[#225f3d] font-semibold text-[14px]">
                      Responsável
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-[#225f3d] font-semibold text-[14px]">
                      Criado em
                    </TableHead>
                    <TableHead className="text-right text-[#225f3d] font-semibold text-[14px]">
                      Ação
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className="border-[#f0f0f0] odd:bg-white even:bg-[#fbfbfb] hover:bg-[#f0f0f0]/50 transition-colors"
                    >
                      <TableCell className="font-mono text-xs text-slate-500">
                        {c.id.split('-')[0].toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium text-[#212121] truncate max-w-[250px]">
                        {c.titulo}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor[c.status]} variant="secondary">
                          {statusLabel[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge className={prioColor[c.prioridade]} variant="secondary">
                          {prioLabel[c.prioridade]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-[#212121]">
                        {c.responsavel?.nome_completo || '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-[#212121]">
                        {format(new Date(c.criado_em), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="text-[#225f3d] hover:text-[#225f3d] hover:bg-[#c8e6c9]/50"
                        >
                          <Link to={`/dashboard/chamados/${c.id}`}>
                            <ExternalLink className="h-4 w-4 mr-2" /> Ver detalhes
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-4">
              {filtered.map((c) => (
                <Card
                  key={c.id}
                  className="border-[#f0f0f0] shadow-sm hover:shadow-subtle transition-all"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="font-mono text-xs text-slate-500">
                          #{c.id.split('-')[0].toUpperCase()}
                        </span>
                        <h4 className="font-medium leading-tight">{c.titulo}</h4>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={statusColor[c.status]} variant="secondary">
                        {statusLabel[c.status]}
                      </Badge>
                      <Badge className={prioColor[c.prioridade]} variant="secondary">
                        {prioLabel[c.prioridade]}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-600">
                      <span>{c.responsavel?.nome_completo || 'Sem responsável'}</span>
                      <span>{format(new Date(c.criado_em), 'dd/MM/yy')}</span>
                    </div>
                    <Button asChild variant="outline" className="w-full mt-2">
                      <Link to={`/dashboard/chamados/${c.id}`}>Ver detalhes</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
