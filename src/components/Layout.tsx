import { Outlet, useLocation, Navigate, Link, useNavigate } from 'react-router-dom'
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
  PlusCircle,
  Folder,
  FileText,
  Wrench,
  CheckCircle,
  Archive,
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
  const isResponsavel = tipo === 'responsavel' || tipo === 'sinistro'
  const isAdmin = tipo === 'admin'
  const isVistoriador = tipo === 'vistoriador'
  const isCoc = tipo === 'coc'
  const isSos = tipo === 'sos'
  const isJuridico = tipo === 'juridico'
  const isSecretariaTecnica = tipo === 'secretaria_tecnica'
  const isDiretoria = profile?.departamento === 'Diretoria'
  const isDp = tipo === 'dp'

  if (isDp) return null

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
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/dashboard/novo-chamado'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/dashboard/novo-chamado">
                        <PlusCircle />
                        <span>Abrir Chamado</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
                </>
              )}

              {(isResponsavel || isJuridico) && (
                <>
                  {isResponsavel && (
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
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/dashboard/meus-atendimentos'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/dashboard/meus-atendimentos">
                        <PlayCircle />
                        <span>Atendimentos</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/dashboard/finalizados'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/dashboard/finalizados">
                        <Archive />
                        <span>Finalizados</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/dashboard/novo-chamado'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/dashboard/novo-chamado">
                        <PlusCircle />
                        <span>Abrir Chamado</span>
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

              {(isAdmin || isSecretariaTecnica) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/dashboard/secretaria-tecnica'}
                    className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                  ></SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isDiretoria && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/dashboard/vales-aprovacao'}
                    className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                  >
                    <Link to="/dashboard/vales-aprovacao">
                      <CheckCircle />
                      <span>Vales para aprovação</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isCoc && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/coc/novo'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/coc/novo">
                        <PlusCircle />
                        <span>Abrir Chamado</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/coc/sinistros'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/coc/sinistros">
                        <FileText />
                        <span>Sinistros</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {isSos && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/sos/pendentes'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/sos/pendentes">
                        <LifeBuoy />
                        <span>Chamados Pendentes</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/coc/sinistros'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/coc/sinistros">
                        <FileText />
                        <span>Sinistros</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {isVistoriador && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/vistoria/novo'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/vistoria/novo">
                        <PlusCircle />
                        <span>Nova Vistoria</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/vistoria/pendentes'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/vistoria/pendentes">
                        <FileText />
                        <span>Docs Pendentes</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/espelhos-danos'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    >
                      <Link to="/espelhos-danos">
                        <FileText />
                        <span>Espelhos de Danos</span>
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
                      isActive={location.pathname === '/os-manutencao'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    ></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/os-manutencao-leste'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    ></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/carros-liberados-plantao'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    ></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/carros-liberados-leste'}
                      className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                    ></SidebarMenuButton>
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

        {(isResponsavel || isJuridico) && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/dashboard/documentos'}
                    className="data-[active=true]:bg-transparent data-[active=true]:text-[#c8e6c9] hover:bg-[#c8e6c9]/10 hover:text-[#c8e6c9] text-white transition-colors"
                  >
                    <Link to="/dashboard/documentos">
                      <Folder />
                      <span>Documentos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
                {(profile?.nome_completo || user?.email)?.[0]}
              </span>
            )}
            <div
              className="text-sm truncate font-medium flex-1 bg-transparent border-[transparent] shadow-[0px_0px_6px_0px_transparent] text-[#ffffff]"
              title={profile?.nome_completo || user?.email || ''}
            >
              {profile?.nome_completo || user?.email}
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

function useRealtimeNotifications(userId: string | undefined, profile: any) {
  const navigate = useNavigate()

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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documentos' },
        async (payload) => {
          const doc = payload.new
          let shouldNotify = false

          if (doc.chamado_id) {
            const { data } = await supabase
              .from('chamados')
              .select('responsavel_id')
              .eq('id', doc.chamado_id)
              .single()

            if (data && data.responsavel_id === userId) {
              shouldNotify = true
            }
          } else {
            if (
              profile?.tipo_usuario === 'responsavel' ||
              profile?.tipo_usuario === 'sinistro' ||
              profile?.tipo_usuario === 'admin' ||
              profile?.tipo_usuario === 'juridico' ||
              profile?.tipo_usuario === 'secretaria_tecnica'
            ) {
              shouldNotify = true
            }
          }

          if (shouldNotify) {
            toast('Novo documento recebido', {
              description: `Um novo documento foi anexado: ${doc.tipo_documento} - ${doc.nome_arquivo}`,
              icon: <FileText className="h-5 w-5 text-[#225f3d]" />,
              duration: 5000,
              position: 'bottom-right',
              action: {
                label: 'Ver',
                onClick: () => navigate('/dashboard/documentos'),
              },
              cancel: {
                label: 'Fechar',
                onClick: () => {},
              },
              style: {
                background: '#ffffff',
                borderLeft: '4px solid #225f3d',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                color: '#0f172a',
              },
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, profile, navigate])
}

export default function Layout() {
  const { user, profile, loading, signOut } = useAuth()
  const location = useLocation()
  const isAuthRoute = location.pathname === '/' || location.pathname === '/cadastro'

  useRealtimeNotifications(user?.id, profile)

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
    if (profile?.tipo_usuario === 'vistoriador') {
      return <Navigate to="/vistoria/novo" replace />
    }
    if (profile?.tipo_usuario === 'coc') {
      return <Navigate to="/coc/novo" replace />
    }
    if (profile?.tipo_usuario === 'sos') {
      return <Navigate to="/sos/pendentes" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  // Redirect Secretária Técnica from other areas
  if (user && profile?.tipo_usuario === 'secretaria_tecnica') {
    const isSecRoute =
      location.pathname === '/dashboard/secretaria-tecnica' ||
      location.pathname === '/dashboard/perfil'
    if (!isSecRoute) {
      return <Navigate to="/dashboard/secretaria-tecnica" replace />
    }
  }

  // Redirect Vistoriador from other areas
  if (user && profile?.tipo_usuario === 'vistoriador') {
    const isVistoriadorRoute =
      location.pathname.startsWith('/vistoria') ||
      location.pathname === '/espelhos-danos' ||
      location.pathname === '/dashboard/perfil'
    if (!isVistoriadorRoute) {
      return <Navigate to="/vistoria/novo" replace />
    }
  }

  // Redirect COC from other areas
  if (user && profile?.tipo_usuario === 'coc') {
    const isCocRoute =
      location.pathname.startsWith('/coc') || location.pathname === '/dashboard/perfil'
    if (!isCocRoute) {
      return <Navigate to="/coc/novo" replace />
    }
  }

  // Redirect SOS from other areas
  if (user && profile?.tipo_usuario === 'sos') {
    const isSosRoute =
      location.pathname.startsWith('/sos') ||
      location.pathname === '/coc/sinistros' ||
      location.pathname === '/dashboard/perfil'
    if (!isSosRoute) {
      return <Navigate to="/sos/pendentes" replace />
    }
  }

  // Redirect Juridico from Fila de Atendimento
  if (
    user &&
    profile?.tipo_usuario === 'juridico' &&
    location.pathname === '/dashboard/chamados-abertos'
  ) {
    return <Navigate to="/dashboard/meus-atendimentos" replace />
  }

  // Prevent non-admin and non-dp from accessing /vales-aprovados
  if (
    user &&
    location.pathname === '/vales-aprovados' &&
    profile?.tipo_usuario !== 'dp' &&
    profile?.tipo_usuario !== 'admin'
  ) {
    return <Navigate to="/dashboard" replace />
  }

  // Redirect DP from other areas
  if (user && profile?.tipo_usuario === 'dp') {
    const isDpRoute = location.pathname === '/vales-aprovados'
    if (!isDpRoute) {
      return <Navigate to="/vales-aprovados" replace />
    }
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
  if (profile?.tipo_usuario === 'dp') {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6 bg-[#225f3d] text-white sticky top-0 z-10 shadow-md">
          <div className="flex items-center gap-4">
            <img src={logoBranco} alt="Via Sudeste" className="h-8 w-auto object-contain" />
            <span className="font-semibold text-lg hidden sm:block">Departamento Pessoal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium hidden sm:flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold uppercase">
                {(profile?.nome_completo || user?.email)?.[0]}
              </span>
              {profile?.nome_completo || user?.email}
            </div>
            <Button
              variant="ghost"
              className="text-white hover:text-white hover:bg-white/10"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    )
  }

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
                {(profile?.nome_completo || user?.email)?.[0]}
              </span>
            )}
            {profile?.nome_completo || user?.email}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto animate-fade-in">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
