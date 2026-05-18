import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, MoreVertical, Edit2, Power, Trash2 } from 'lucide-react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useGestaoEquipe } from '@/hooks/use-gestao-equipe'
import { GestaoEquipeModal } from './gestao-equipe-modal'

export function GestaoEquipe() {
  const { users, loading, loadUsers, toggleActive, handleDelete } = useGestaoEquipe()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  const openNewModal = () => {
    setEditingUser(null)
    setModalOpen(true)
  }

  const openEditModal = (u: any) => {
    setEditingUser(u)
    setModalOpen(true)
  }

  return (
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
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-md border overflow-x-auto">
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
                              : u.tipo_usuario === 'vistoriador'
                                ? 'border-orange-200 text-orange-700 bg-orange-50'
                                : 'border-blue-200 text-blue-700 bg-blue-50'
                          }
                        >
                          {u.tipo_usuario === 'admin'
                            ? 'Admin'
                            : u.tipo_usuario === 'vistoriador'
                              ? 'Vistoriador'
                              : 'Responsável'}
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
                              <Power className="h-4 w-4 mr-2" /> {u.ativo ? 'Desativar' : 'Ativar'}
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
                      <Badge
                        variant="outline"
                        className={
                          u.tipo_usuario === 'admin'
                            ? 'border-purple-200 text-purple-700 bg-purple-50'
                            : u.tipo_usuario === 'vistoriador'
                              ? 'border-orange-200 text-orange-700 bg-orange-50'
                              : 'border-blue-200 text-blue-700 bg-blue-50'
                        }
                      >
                        {u.tipo_usuario === 'admin'
                          ? 'Admin'
                          : u.tipo_usuario === 'vistoriador'
                            ? 'Vistoriador'
                            : 'Responsável'}
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

      <GestaoEquipeModal
        open={modalOpen}
        setOpen={setModalOpen}
        user={editingUser}
        onSuccess={loadUsers}
      />
    </Card>
  )
}
