import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export default function SinistrosCoc() {
  const [sinistros, setSinistros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [monthFilter, setMonthFilter] = useState('all')
  const [carroFilter, setCarroFilter] = useState('all')
  const [avariaFilter, setAvariaFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [osModalOpen, setOsModalOpen] = useState(false)
  const [selectedSinistro, setSelectedSinistro] = useState<any>(null)
  const [osNumber, setOsNumber] = useState('')
  const [savingOS, setSavingOS] = useState(false)

  const fetchSinistros = async () => {
    try {
      const { data: cocUsers } = await supabase
        .from('perfil_usuario')
        .select('id')
        .eq('tipo_usuario', 'coc')

      const cocUserIds = cocUsers?.map((u: any) => u.id) || []

      if (cocUserIds.length === 0) {
        setSinistros([])
        return
      }

      const { data, error } = await supabase
        .from('chamados')
        .select(`
          *,
          anexos_chamado(url_arquivo)
        `)
        .in('usuario_id', cocUserIds)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setSinistros(data || [])
    } catch (error: any) {
      toast.error('Erro ao buscar sinistros: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSinistros()

    const channel = supabase
      .channel('sinistros_coc_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => {
        fetchSinistros()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const uniqueCars = useMemo(() => {
    const cars = new Set(sinistros.map((s) => s.carro).filter(Boolean))
    return Array.from(cars).sort()
  }, [sinistros])

  const uniqueMonths = useMemo(() => {
    const months = new Set(sinistros.map((s) => format(parseISO(s.criado_em), 'yyyy-MM')))
    return Array.from(months).sort().reverse()
  }, [sinistros])

  const formatMonth = (m: string) => {
    const str = format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: ptBR })
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const filteredSinistros = useMemo(() => {
    return sinistros.filter((s) => {
      if (monthFilter !== 'all' && format(parseISO(s.criado_em), 'yyyy-MM') !== monthFilter)
        return false
      if (carroFilter !== 'all' && s.carro !== carroFilter) return false
      if (avariaFilter !== 'all' && s.tipo_chamado !== avariaFilter) return false
      if (statusFilter === 'com-os' && !s.numero_os) return false
      if (statusFilter === 'sem-os' && !!s.numero_os) return false
      return true
    })
  }, [sinistros, monthFilter, carroFilter, avariaFilter, statusFilter])

  const handleSaveOS = async () => {
    if (!osNumber.trim()) {
      toast.error('Informe o número da OS')
      return
    }

    setSavingOS(true)
    try {
      const { error } = await supabase
        .from('chamados')
        .update({ numero_os: osNumber })
        .eq('id', selectedSinistro.id)

      if (error) throw error

      toast.success('OS salva com sucesso')
      setOsModalOpen(false)
      fetchSinistros()
    } catch (error: any) {
      toast.error('Erro ao salvar OS: ' + error.message)
    } finally {
      setSavingOS(false)
    }
  }

  const openView = (s: any) => {
    setSelectedSinistro(s)
    setViewModalOpen(true)
  }

  const openOS = (s: any) => {
    setSelectedSinistro(s)
    setOsNumber('')
    setOsModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-hidden animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Sinistros</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="space-y-2">
          <Label>Data (Mês)</Label>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {uniqueMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonth(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Carro</Label>
          <Select value={carroFilter} onValueChange={setCarroFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {uniqueCars.map((c: any) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tipo de Avaria</Label>
          <Select value={avariaFilter} onValueChange={setAvariaFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="Avaria sem vítima">Avaria sem vítima</SelectItem>
              <SelectItem value="Avaria com vítima">Avaria com vítima</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="com-os">Com OS</SelectItem>
              <SelectItem value="sem-os">Sem OS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Data</TableHead>
                <TableHead className="whitespace-nowrap">Título</TableHead>
                <TableHead className="whitespace-nowrap">Motorista</TableHead>
                <TableHead className="whitespace-nowrap">Colaborador</TableHead>
                <TableHead className="whitespace-nowrap">Cargo</TableHead>
                <TableHead className="whitespace-nowrap">Linha</TableHead>
                <TableHead className="whitespace-nowrap">Carro</TableHead>
                <TableHead className="whitespace-nowrap">Local</TableHead>
                <TableHead className="whitespace-nowrap">Avaria</TableHead>
                <TableHead className="whitespace-nowrap">OS</TableHead>
                <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredSinistros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                    Nenhum sinistro registrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredSinistros.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(parseISO(s.criado_em), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={s.titulo}>
                      {s.titulo}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {s.nome_motorista || '-'} <br />
                      <span className="text-xs text-slate-500">{s.registro_motorista || ''}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {s.nome_cobrador || '-'} <br />
                      <span className="text-xs text-slate-500">{s.registro_cobrador || ''}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">-</TableCell>
                    <TableCell className="whitespace-nowrap">{s.linha || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{s.carro || '-'}</TableCell>
                    <TableCell className="max-w-[150px] truncate" title={s.local_ocorrencia}>
                      {s.local_ocorrencia || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={
                          s.tipo_chamado === 'Avaria com vítima'
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-orange-50 text-orange-600 border-orange-200'
                        }
                      >
                        {s.tipo_chamado || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {s.numero_os ? (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100">
                          {s.numero_os}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-slate-500">
                          Sem OS
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openView(s)}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                        </Button>
                        {!s.numero_os && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openOS(s)}
                            title="Preencher OS"
                          >
                            <PlusCircle className="w-4 h-4 text-emerald-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Sinistro</DialogTitle>
          </DialogHeader>

          {selectedSinistro && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Título</p>
                <p className="text-sm">{selectedSinistro.titulo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Data de Criação</p>
                <p className="text-sm">
                  {format(parseISO(selectedSinistro.criado_em), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm font-medium text-slate-500">Descrição</p>
                <p className="text-sm bg-slate-50 p-3 rounded-md whitespace-pre-wrap">
                  {selectedSinistro.descricao}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Motorista</p>
                <p className="text-sm">
                  {selectedSinistro.nome_motorista || '-'} (Reg:{' '}
                  {selectedSinistro.registro_motorista || '-'})
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Colaborador</p>
                <p className="text-sm">
                  {selectedSinistro.nome_cobrador || '-'} (Reg:{' '}
                  {selectedSinistro.registro_cobrador || '-'})
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Cargo</p>
                <p className="text-sm">-</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Linha</p>
                <p className="text-sm">{selectedSinistro.linha || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Carro</p>
                <p className="text-sm">{selectedSinistro.carro || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Local</p>
                <p className="text-sm">{selectedSinistro.local_ocorrencia || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Operações</p>
                <p className="text-sm">{selectedSinistro.operacao || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Tipo de Avaria</p>
                <p className="text-sm">{selectedSinistro.tipo_chamado || '-'}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm font-medium text-slate-500">OS</p>
                <p className="text-sm font-bold text-emerald-600">
                  {selectedSinistro.numero_os || 'Não preenchido'}
                </p>
              </div>

              {selectedSinistro.anexos_chamado?.[0] && (
                <div className="space-y-1 sm:col-span-2 mt-4">
                  <p className="text-sm font-medium text-slate-500 mb-2">Anexo</p>
                  {selectedSinistro.anexos_chamado[0].url_arquivo
                    .toLowerCase()
                    .match(/\.(jpeg|jpg|gif|png)$/) ? (
                    <img
                      src={selectedSinistro.anexos_chamado[0].url_arquivo}
                      alt="Anexo"
                      className="max-w-full h-auto rounded-md border border-slate-200"
                    />
                  ) : (
                    <a
                      href={selectedSinistro.anexos_chamado[0].url_arquivo}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline bg-blue-50 px-4 py-2 rounded-md"
                    >
                      <Eye className="w-4 h-4" />
                      Visualizar Documento
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Fechar
            </Button>
            {selectedSinistro && !selectedSinistro.numero_os && (
              <Button
                onClick={() => {
                  setViewModalOpen(false)
                  openOS(selectedSinistro)
                }}
              >
                Preencher OS
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={osModalOpen} onOpenChange={setOsModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Preencher Ordem de Serviço</DialogTitle>
            <DialogDescription>Vincule um número de OS a este sinistro.</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="os_number">
                Número da OS <span className="text-red-500">*</span>
              </Label>
              <Input
                id="os_number"
                placeholder="Ex: 12345"
                value={osNumber}
                onChange={(e) => setOsNumber(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOsModalOpen(false)} disabled={savingOS}>
              Cancelar
            </Button>
            <Button onClick={handleSaveOS} disabled={savingOS}>
              {savingOS ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
