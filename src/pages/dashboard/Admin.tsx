import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, UserCog } from 'lucide-react'
import { VisaoGeral } from '@/components/admin/visao-geral'
import { GestaoEquipe } from '@/components/admin/gestao-equipe'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user)
      return supabase
        .from('perfil_usuario')
        .select('tipo_usuario')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setIsAdmin(data?.tipo_usuario === 'admin')
        })
  }, [user])

  if (isAdmin === null) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in-up">
      <h1 className="text-3xl font-bold tracking-tight text-slate-800">Painel Administrativo</h1>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList>
          <TabsTrigger value="geral" className="flex gap-2">
            <Activity className="h-4 w-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="equipe" className="flex gap-2">
            <UserCog className="h-4 w-4" /> Equipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <VisaoGeral />
        </TabsContent>

        <TabsContent value="equipe" className="space-y-6">
          <GestaoEquipe />
        </TabsContent>
      </Tabs>
    </div>
  )
}
