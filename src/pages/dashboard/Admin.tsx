import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Users,
  Ticket,
  Activity,
  Plus,
  MoreVertical,
  Edit2,
  Power,
  Trash2,
  UserCog,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { createAdminUser, deleteAdminUser } from '@/services/manage-users'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ usuarios: 0, chamados: 0 })
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    tipo_usuario: 'responsavel',
  })
  const [isSaving, setIsSaving] = useState(false)

  const fetchStats = async () => {
    const [{ count: uCount }, { count: cCount }] = await Promise.all([
      supabase.from('perfil_usuario').select('*', { count: 'exact', head: true }),
      supabase.from('chamados').select('*', { count: 'exact', head: true }),
    ])
    setStats({ usuarios: uCount || 0, chamados: cCount || 0 })
  }

  const loadUsers = async () => {
    setLoadingUsers(true)
    const { data } = await supabase
      .from('perfil_usuario')
      .select('*')
      .in('tipo_usuario', ['responsavel', 'admin'])
      .order('criado_em', { ascending: false })
    if (data) setUsers(data)
    setLoadingUsers(false)
  }

  useEffect(() => {
    fetchStats()
    loadUsers()
  }, [])

  const openNewModal = () => {
    setEditingUser(null)
    setFormData({ nome_completo: '', email: '', tipo_usuario: 'responsavel' })
    setModalOpen(true)
  }

  const openEditModal = (u: any) => {
    setEditingUser(u)
    setFormData({ nome_completo: u.nome_completo, email: u.email, tipo_usuario: u.tipo_usuario })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nome_completo || !formData.email) return toast.error('Preencha todos os campos')
    setIsSaving(true)
    try {
      if (editingUser) {
        const { error } = await supabase
          .from('perfil_usuario')
          .update({
            nome_completo: formData.nome_completo,
            tipo_usuario: formData.tipo_usuario,
          })
          .eq('id', editingUser.id)
        if (error) throw error
        toast.success('Usuário atualizado com sucesso')
      } else {
        const { data, error } = await createAdminUser(formData)
        if (error || data?.error) throw error || new Error(data?.error)
        toast.success('Usuário criado com sucesso')
        fetchStats()
      }
      loadUsers()
      setModalOpen(false)
    } catch (err: any) {
      if (err.message?.includes('already registered')) toast.error('Este e-mail já está em uso')
      else toast.error('Erro ao salvar usuário')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleActive = async (u: any) => {
    const newStatus = !u.ativo
    const { error } = await supabase
      .from('perfil_usuario')
      .update({ ativo: newStatus })
      .eq('id', u.id)
    if (error) toast.error('Erro ao alterar status')
    else {
      toast.success(`Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso`)
      loadUsers()
    }
  }

  const handleDelete = async (u: any) => {
    if (
      !window.confirm(
        'Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.',
      )
    )
      return
    try {
      const { data, error } = await deleteAdminUser(u.id)
      if (error || data?.error) throw error || new Error(data?.error)
      toast.success('Usuário deletado com sucesso')
      loadUsers()
      fetchStats()
    } catch (err) {
      toast.error('Erro ao deletar usuário')
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 animate-fade-in-up">
      <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>

      <Tabs defaultValue="equipe" className="space-y-6">
        <TabsList>
          <TabsTrigger value="equipe" className="flex gap-2">
            <UserCog className="h-4 w-4" /> Equipe
          </TabsTrigger>
          <TabsTrigger value="geral" className="flex gap-2">
            <Activity className="h-4 w-4" /> Visão Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Usuários Cadastrados
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.usuarios}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Chamados
                </CardTitle>
                <Ticket className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.chamados}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipe">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestão de Responsáveis</CardTitle>
                <CardDescription>Gerencie a equipe de suporte e administradores.</CardDescription>
              </div>
              <Button onClick={openNewModal}>
                <Plus className="h-4 w-4 mr-2" /> Novo
              </Button>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="hidden md:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.nome_completo}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  u.tipo_usuario === 'admin'
                                    ? 'border-purple-200 text-purple-700 bg-purple-50'
                                    : 'border-blue-200 text-blue-700 bg-blue-50'
                                }
                              >
                                {u.tipo_usuario === 'admin' ? 'Admin' : 'Responsável'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={u.ativo ? 'default' : 'secondary'}
                                className={u.ativo ? 'bg-green-600 hover:bg-green-700' : ''}
                              >
                                {u.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditModal(u)}>
                                    <Edit2 className="h-4 w-4 mr-2" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleActive(u)}>
                                    <Power className="h-4 w-4 mr-2" />{' '}
                                    {u.ativo ? 'Desativar' : 'Ativar'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(u)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Deletar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-4 md:hidden">
                    {users.map((u) => (
                      <Card key={u.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-base">{u.nome_completo}</CardTitle>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="-mr-2 h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditModal(u)}>
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleActive(u)}>
                                  {u.ativo ? 'Desativar' : 'Ativar'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(u)}
                                  className="text-red-600"
                                >
                                  Deletar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <CardDescription>{u.email}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2">
                            <Badge variant="outline">
                              {u.tipo_usuario === 'admin' ? 'Admin' : 'Responsável'}
                            </Badge>
                            <Badge
                              variant={u.ativo ? 'default' : 'secondary'}
                              className={u.ativo ? 'bg-green-600' : ''}
                            >
                              {u.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar' : 'Novo'} Responsável</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Atualize as informações do usuário.'
                : 'Cadastre um novo responsável ou admin. A senha inicial será HelpdeskUser@123'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={formData.nome_completo}
                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                placeholder="João da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao@empresa.com"
                type="email"
                disabled={!!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Acesso</Label>
              <Select
                value={formData.tipo_usuario}
                onValueChange={(v) => setFormData({ ...formData, tipo_usuario: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="responsavel">Responsável (Atendimento)</SelectItem>
                  <SelectItem value="admin">Administrador (Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
