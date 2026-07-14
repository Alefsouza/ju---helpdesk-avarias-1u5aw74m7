import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { NotificationsDropdown } from '@/components/NotificationsDropdown'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Ticket,
  PlusCircle,
  Inbox,
  Headphones,
  CheckCircle2,
  FileCheck,
  DollarSign,
  Scale,
  Gavel,
  LayoutDashboard,
  BarChart3,
  FolderOpen,
  Wrench,
  Wallet,
  User,
  LogOut,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import logoImg from '@/assets/logo_branco_transparente_nitido-80a6a.png'

type NavItem = { to: string; label: string; icon: any; show: boolean }
type NavGroup = { section: string; items: NavItem[] }

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAuthPage = location.pathname === '/' || location.pathname === '/cadastro'
  if (isAuthPage || !user) return <Outlet />

  const isAlex = user.email === 'alex.fontes@viasudeste.com'
  const isFinanceiro = user.email === 'financeiro@viasudeste.com'
  const isAdmin = profile?.tipo_usuario === 'admin'
  const isSupport = ['admin', 'responsavel', 'sinistro', 'juridico'].includes(
    profile?.tipo_usuario || '',
  )
  const isJuridico = profile?.tipo_usuario === 'juridico'
  const isSecretaria = profile?.tipo_usuario === 'secretaria_tecnica'
  const isDp = profile?.tipo_usuario === 'dp' || profile?.departamento === 'DP'
  const isCoc = profile?.tipo_usuario === 'coc'
  const isSos = profile?.tipo_usuario === 'sos'
  const isVistoriador = profile?.tipo_usuario === 'vistoriador'
  const showChamados = !isJuridico && !isSecretaria && !isDp && !isCoc && !isSos && !isVistoriador

  const navGroups: NavGroup[] = [
    {
      section: 'Chamados',
      items: [
        {
          to: '/dashboard/meus-chamados',
          label: 'Meus Chamados',
          icon: Ticket,
          show: showChamados,
        },
        {
          to: '/dashboard/novo-chamado',
          label: 'Novo Chamado',
          icon: PlusCircle,
          show: showChamados,
        },
      ],
    },
    {
      section: 'Atendimento',
      items: [
        {
          to: '/dashboard/chamados-abertos',
          label: 'Chamados Abertos',
          icon: Inbox,
          show: isSupport,
        },
        {
          to: '/dashboard/meus-atendimentos',
          label: 'Atendimentos',
          icon: Headphones,
          show: isSupport || isJuridico,
        },
        { to: '/dashboard/finalizados', label: 'Finalizados', icon: CheckCircle2, show: isSupport },
      ],
    },
    {
      section: 'Aprovações',
      items: [
        {
          to: '/dashboard/vales-aprovacao-alex',
          label: 'Vales para Aprovação',
          icon: FileCheck,
          show: isAlex || isAdmin,
        },
        {
          to: '/dashboard/autorizar-parcelas',
          label: 'Autorizar Parcelas',
          icon: DollarSign,
          show: isAlex || isFinanceiro,
        },
      ],
    },
    {
      section: 'Jurídico',
      items: [
        {
          to: '/dashboard/cobranca-terceiros',
          label: 'Cobrança de Terceiros',
          icon: Scale,
          show: isJuridico || isAdmin,
        },
        {
          to: '/dashboard/demanda-judicial',
          label: 'Demanda Judicial',
          icon: Gavel,
          show: isJuridico || isAdmin,
        },
      ],
    },
    {
      section: 'Gestão',
      items: [
        {
          to: '/dashboard/admin',
          label: 'Painel Admin',
          icon: LayoutDashboard,
          show: isAdmin || isAlex,
        },
        {
          to: '/dashboard/relatorios',
          label: 'Relatórios',
          icon: BarChart3,
          show: isAdmin || isAlex,
        },
        { to: '/dashboard/documentos', label: 'Documentos', icon: FolderOpen, show: isAdmin },
        {
          to: '/dashboard/secretaria-tecnica',
          label: 'Secretaria Técnica',
          icon: Wrench,
          show: isSecretaria,
        },
        { to: '/vales-aprovados', label: 'Vales Aprovados', icon: Wallet, show: isDp },
      ],
    },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-center">
        <img src={logoImg} alt="Logo" className="h-8 w-auto" />
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-3">
        {navGroups.map((group) => {
          const visible = group.items.filter((i) => i.show)
          if (visible.length === 0) return null
          return (
            <div key={group.section}>
              <p className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {group.section}
              </p>
              {visible.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>
      <div className="p-2 border-t space-y-1">
        <NavLink
          to="/dashboard/perfil"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <User className="h-4 w-4" />
          Perfil
        </NavLink>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex w-64 flex-col border-r bg-background shrink-0">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="flex-1" />
          <NotificationsDropdown />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
