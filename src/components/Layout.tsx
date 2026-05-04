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
import { Ticket, User, LogOut, LayoutDashboard, LifeBuoy } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

function AppSidebar() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center justify-center border-b px-4 bg-sidebar">
        <div className="flex items-center gap-2 font-bold text-lg text-primary">
          <LifeBuoy className="h-6 w-6" />
          <span>Helpdesk</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/dashboard'}>
                  <Link to="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/dashboard">
                    <Ticket />
                    <span>Meus Chamados</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/dashboard/perfil'}>
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
      <SidebarFooter className="border-t p-4">
        <div className="flex flex-col gap-4">
          <div
            className="text-sm text-muted-foreground truncate px-2 font-medium"
            title={user?.email || ''}
          >
            {user?.email}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
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

export default function Layout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const isAuthRoute = location.pathname === '/' || location.pathname === '/cadastro'

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
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 sm:p-8">
        <div className="mb-8 flex items-center gap-2 text-primary font-bold text-2xl animate-fade-in-down">
          <LifeBuoy className="h-8 w-8" />
          Helpdesk
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
      <SidebarInset className="flex flex-col flex-1 min-h-screen bg-slate-50/50">
        <header className="flex h-16 shrink-0 items-center border-b px-4 gap-4 bg-white sticky top-0 z-10 shadow-sm">
          <SidebarTrigger className="-ml-2" />
          <div className="flex-1" />
          <div className="text-sm font-medium text-slate-700 hidden sm:flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase">
              {user?.email?.[0]}
            </span>
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
