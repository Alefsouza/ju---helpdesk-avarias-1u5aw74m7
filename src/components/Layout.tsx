import { Outlet, useLocation, Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  Ticket,
  User,
  LogOut,
  LayoutDashboard,
  LifeBuoy,
  ShieldAlert,
  PlayCircle,
  FileBarChart,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import logoBranco from '@/assets/logo_branco_transparente_nitido-80a6a.png'
import logoColorido from '@/assets/whatsapp-image-2023-08-10-at-16.17.31-0b937.jpeg'

function AppSidebar() {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()

  const tipo = profile?.tipo_usuario
  const isBasico = tipo === 'basico'
  const isResponsavel = tipo === 'responsavel'
  const isAdmin = tipo === 'admin'

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="py-4 flex items-center justify-center border-b border-white/10 bg-[#225f3d]">
        <Link
          to="/dashboard"
          className="flex items-center justify-center w-full hover:opacity-90 transition-opacity"
        >
          <img
            src={logoBranco}
            alt="Via Sudeste"
            className="w-[150px] h-auto max-w-full object-contain"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-[#225f3d]">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isBasico && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/dashboard/meus-chamados'}
                    className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                  >
                    <Link to="/dashboard/meus-chamados">
                      <Ticket />
                      <span>Meus Chamados</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isResponsavel && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/dashboard/chamados-abertos'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/dashboard/chamados-abertos">
                        <LifeBuoy />
                        <span>Fila de Atendimento</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/dashboard/meus-atendimentos'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/dashboard/meus-atendimentos">
                        <PlayCircle />
                        <span>Meus Atendimentos</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/dashboard/admin'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/dashboard/admin">
                        <ShieldAlert />
                        <span>Painel Admin</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/dashboard/relatorios'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/dashboard/relatorios">
                        <FileBarChart />
                        <span>Relatórios</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/dashboard/perfil'}
                  className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                >
                  <Link to="/dashboard/perfil">
                    <User />
                    <span>Perfil</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-white/10 p-4 bg-[#225f3d]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2">
            {profile?.foto_url ? (
              <img
                src={profile.foto_url}
                alt={profile.nome_completo || 'Avatar'}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 bg-white"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase shrink-0">
                {user?.email?.[0]}
              </span>
            )}
            <div
              className="text-sm truncate font-medium flex-1 bg-transparent border-[transparent] shadow-[0px_0px_6px_0px_transparent] text-[#ffffff]"
              title={user?.email || ''}
            >
              {user?.email}
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function useRealtimeNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('global_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'respostas_chamado' },
        async (payload) => {
          if (payload.new.usuario_id !== userId) {
            const { data } = await supabase
              .from('chamados')
              .select('usuario_id, id')
              .eq('id', payload.new.chamado_id)
              .single()

            if (data && data.usuario_id === userId) {
              const shortId = data.id.split('-')[0].toUpperCase()
              toast.info(`Seu chamado #${shortId} foi respondido!`, {
                position: 'bottom-right',
                duration: 5000,
              })
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])
}

export default function Layout() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const isAuthRoute = location.pathname === '/' || location.pathname === '/cadastro'

  useRealtimeNotifications(user?.id)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    )
  }

  // Redirect unauthenticated users from protected routes
  if (!user && !isAuthRoute) {
    return <Navigate to="/" replace />
  }

  // Redirect authenticated users from auth routes
  if (user && isAuthRoute) {
    return <Navigate to="/dashboard" replace />
  }

  // Auth Layout
  if (isAuthRoute) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-start pt-[40px] bg-[#225f3d] px-4 pb-8 sm:px-8">
        <div className="mb-12 flex items-center justify-center animate-fade-in-down w-full max-w-[400px]">
          <img
            src={logoColorido}
            alt="Via Sudeste"
            className="w-[200px] h-auto md:w-[200px] object-contain rounded-2xl shadow-2xl"
          />
        </div>
        <div className="w-full max-w-[400px]">
          <Outlet />
        </div>
      </main>
    )
  }

  // App Layout
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1 min-h-screen bg-white">
        <header className="flex h-16 shrink-0 items-center border-b px-4 gap-4 bg-white sticky top-0 z-10 shadow-sm">
          <SidebarTrigger className="-ml-2 text-slate-700" />
          <div className="flex md:hidden items-center ml-2">
            <img
              src={logoColorido}
              alt="Via Sudeste"
              className="h-8 w-auto object-contain rounded"
            />
          </div>
          <div className="flex-1" />
          <div className="text-sm font-medium text-slate-700 hidden sm:flex items-center gap-2">
            {profile?.foto_url ? (
              <img
                src={profile.foto_url}
                alt={profile.nome_completo || 'Avatar'}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase">
                {user?.email?.[0]}
              </span>
            )}
            {user?.email}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto animate-fade-in">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
