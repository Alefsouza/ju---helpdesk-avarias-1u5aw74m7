import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Key, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/client'
import { AlterarSenhaModal } from './alterar-senha-modal'
import { format } from 'date-fns'

export function GerenciarUsuarios() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const loadUsers = async () => {
    setLoading(true)
    setError(false)
    const { data, error: err } = await supabase
      .from('perfil_usuario')
      .select('*')
      .order('criado_em', { ascending: false })

    if (err) {
      setError(true)
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const openPasswordModal = (u: any) => {
    setSelectedUser(u)
    setModalOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Usuários</CardTitle>
        <CardDescription>
          Visualize todos os usuários do sistema e gerencie senhas e acessos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">Erro ao carregar usuários</p>
            <Button onClick={loadUsers} variant="outline">
              Tentar novamente
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center text-slate-500">
            <Users className="h-12 w-12 mb-4 text-slate-300" />
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {u.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">{u.nome_completo}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {u.tipo_usuario}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(u.criado_em), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openPasswordModal(u)}>
                        <Key className="h-4 w-4 mr-2" /> Alterar Senha
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlterarSenhaModal open={modalOpen} setOpen={setModalOpen} user={selectedUser} />
    </Card>
  )
}
