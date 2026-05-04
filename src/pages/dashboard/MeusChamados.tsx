import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Ticket, Search, Trash2, AlertCircle, Plus } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

type Chamado = {
  id: string
  titulo: string
  status: string
  prioridade: string
  criado_em: string
}

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-800 border-transparent',
  em_atendimento: 'bg-yellow-100 text-yellow-800 border-transparent',
  finalizado: 'bg-green-100 text-green-800 border-transparent',
}

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_atendimento: 'Em Atendimento',
  finalizado: 'Finalizado',
}

const priorityColors: Record<string, string> = {
  baixa: 'bg-slate-100 text-slate-800 border-transparent',
  media: 'bg-orange-100 text-orange-800 border-transparent',
  alta: 'bg-red-100 text-red-800 border-transparent',
}

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export default function MeusChamados() {
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [priorityFilter, setPriorityFilter] = useState('todas')

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const fetchChamados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      let query = supabase
        .from('chamados')
        .select('id, titulo, status, prioridade, criado_em')
        .eq('usuario_id', user.id)
        .order('criado_em', { ascending: false })

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter)
      }
      if (priorityFilter !== 'todas') {
        query = query.eq('prioridade', priorityFilter)
      }
      if (debouncedSearch) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          debouncedSearch,
        )
        if (isUUID) {
          query = query.or(`titulo.ilike.%${debouncedSearch}%,id.eq.${debouncedSearch}`)
        } else {
          query = query.ilike('titulo', `%${debouncedSearch}%`)
        }
      }

      const { data, error: dbError } = await query
      if (dbError) throw dbError

      setChamados(data || [])
    } catch (err: any) {
      console.error(err)
      setError('Erro ao carregar chamados')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, priorityFilter])

  useEffect(() => {
    fetchChamados()
  }, [fetchChamados])

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Autenticação necessária')

      // 1. Registra no histórico ANTES de deletar
      await supabase.from('historico_chamado').insert({
        chamado_id: deleteId,
        acao: 'deletado',
        usuario_id: user.id,
      })

      // 2. Deleta o chamado (cascade delete limpará anexos e respostas relacionados)
      const { error: delError } = await supabase.from('chamados').delete().eq('id', deleteId)
      if (delError) throw delError

      toast({
        title: 'Sucesso',
        description: 'Chamado excluído com sucesso.',
      })

      fetchChamados()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o chamado.',
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Chamados</h1>
          <p className="text-muted-foreground">Gerencie seus tickets de atendimento.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/dashboard/novo-chamado">
            <Plus className="mr-2 h-4 w-4" />
            Novo Chamado
          </Link>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-muted/30 p-4 rounded-lg border">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou ID..."
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="md:col-span-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Prioridades</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 md:h-16 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-red-50 text-red-800 border border-red-200 rounded-lg">
          <AlertCircle className="h-10 w-10 mb-3 text-red-500" />
          <p className="font-medium mb-4">{error}</p>
          <Button variant="outline" onClick={fetchChamados}>
            Tentar Novamente
          </Button>
        </div>
      ) : chamados.length === 0 ? (
        <div className="text-center py-20 px-4 bg-muted/20 border border-dashed rounded-lg">
          <Ticket className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhum chamado encontrado</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Não encontramos nenhum chamado correspondente aos filtros atuais ou você ainda não abriu
            nenhum ticket.
          </p>
          <Button asChild variant="secondary">
            <Link to="/dashboard/novo-chamado">Criar meu primeiro chamado</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chamados.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        to={`/dashboard/chamados/${c.id}`}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {c.titulo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[c.status] || ''}>
                        {statusLabels[c.status] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={priorityColors[c.prioridade] || ''}>
                        {priorityLabels[c.prioridade] || c.prioridade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(c.criado_em)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={c.status !== 'aberto'}
                        onClick={() => setDeleteId(c.id)}
                        className={
                          c.status === 'aberto'
                            ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                            : ''
                        }
                        title={
                          c.status !== 'aberto'
                            ? 'Apenas chamados abertos podem ser excluídos'
                            : 'Excluir chamado'
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {chamados.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(c.criado_em)}</span>
                  </div>

                  <Link
                    to={`/dashboard/chamados/${c.id}`}
                    className="font-semibold text-lg leading-tight hover:text-primary"
                  >
                    {c.titulo}
                  </Link>

                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className={statusColors[c.status] || ''}>
                      {statusLabels[c.status] || c.status}
                    </Badge>
                    <Badge variant="outline" className={priorityColors[c.prioridade] || ''}>
                      {priorityLabels[c.prioridade] || c.prioridade}
                    </Badge>
                  </div>

                  <div className="pt-3 mt-1 border-t flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={c.status !== 'aberto'}
                      onClick={() => setDeleteId(c.id)}
                      className={
                        c.status === 'aberto' ? 'text-red-600 border-red-200 hover:bg-red-50' : ''
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O chamado e todos os dados associados a ele serão
              apagados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir Chamado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
