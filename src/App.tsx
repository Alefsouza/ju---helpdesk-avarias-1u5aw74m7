import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import MeusChamados from './pages/dashboard/MeusChamados'
import NovoChamado from './pages/dashboard/NovoChamado'
import ChamadosAbertos from './pages/dashboard/ChamadosAbertos'
import MeusAtendimentos from './pages/dashboard/MeusAtendimentos'
import AdminDashboard from './pages/dashboard/Admin'
import Perfil from './pages/dashboard/Perfil'
import ChamadoDetalhes from './pages/dashboard/ChamadoDetalhes'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import { AuthProvider } from './hooks/use-auth'

const App = () => (
  <AuthProvider>
    <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/meus-chamados" element={<MeusChamados />} />
            <Route path="/dashboard/novo-chamado" element={<NovoChamado />} />
            <Route path="/dashboard/chamados-abertos" element={<ChamadosAbertos />} />
            <Route path="/dashboard/meus-atendimentos" element={<MeusAtendimentos />} />
            <Route path="/dashboard/chamados/:id" element={<ChamadoDetalhes />} />
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="/dashboard/perfil" element={<Perfil />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
