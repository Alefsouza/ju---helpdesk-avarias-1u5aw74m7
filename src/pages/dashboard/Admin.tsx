import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Ticket, Activity } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ usuarios: 0, chamados: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: uCount }, { count: cCount }] = await Promise.all([
        supabase.from('perfil_usuario').select('*', { count: 'exact', head: true }),
        supabase.from('chamados').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        usuarios: uCount || 0,
        chamados: cCount || 0,
      })
    }
    fetchStats()
  }, [])

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 animate-fade-in-up">
      <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>

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

      <Card>
        <CardHeader>
          <CardTitle>Visão Geral do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-slate-500">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>O sistema está operando normalmente. Todas as permissões RLS foram aplicadas.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
