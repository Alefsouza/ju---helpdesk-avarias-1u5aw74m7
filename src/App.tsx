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
import Relatorios from './pages/dashboard/Relatorios'
import Documentos from './pages/dashboard/Documentos'
import Perfil from './pages/dashboard/Perfil'
import ChamadoDetalhes from './pages/dashboard/ChamadoDetalhes'
import VistoriaForm from './pages/vistoria/VistoriaForm'
import DocumentosPendentes from './pages/vistoria/DocumentosPendentes'
import EspelhosDanos from './pages/vistoria/EspelhosDanos'
import NovoChamadoCoc from './pages/coc/NovoChamadoCoc'
import FormularioIdo from './pages/ido/FormularioIdo'
import SucessoIdo from './pages/ido/Sucesso'
import FormularioIdoFixo from './pages/ido/FormularioIdoFixo'
import SucessoIdoFixo from './pages/ido/SucessoIdoFixo'
import FormularioEspelhoDanos from './pages/espelho-danos/FormularioEspelhoDanos'
import SucessoEspelhoDanos from './pages/espelho-danos/Sucesso'
import FormularioEspelhoDanosFixo from './pages/espelho-danos/FormularioEspelhoDanosFixo'
import SucessoEspelhoDanosFixo from './pages/espelho-danos/SucessoEspelhoDanosFixo'
import ChamadasPendentesSos from './pages/sos/ChamadasPendentes'
import OsManutencao from './pages/OsManutencao'
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
            <Route path="/dashboard/relatorios" element={<Relatorios />} />
            <Route path="/dashboard/documentos" element={<Documentos />} />
            <Route path="/dashboard/perfil" element={<Perfil />} />
            <Route path="/vistoria/novo" element={<VistoriaForm />} />
            <Route path="/vistoria/pendentes" element={<DocumentosPendentes />} />
            <Route path="/espelhos-danos" element={<EspelhosDanos />} />
            <Route path="/coc/novo" element={<NovoChamadoCoc />} />
            <Route path="/sos/pendentes" element={<ChamadasPendentesSos />} />
          </Route>
          <Route path="/espelho-danos-fixo/sucesso" element={<SucessoEspelhoDanosFixo />} />
          <Route path="/espelho-danos-fixo" element={<FormularioEspelhoDanosFixo />} />
          <Route path="/ido-fixo/sucesso" element={<SucessoIdoFixo />} />
          <Route path="/ido-fixo" element={<FormularioIdoFixo />} />
          <Route path="/ido/sucesso" element={<SucessoIdo />} />
          <Route path="/ido/:id" element={<FormularioIdo />} />
          <Route path="/espelho-danos/sucesso" element={<SucessoEspelhoDanos />} />
          <Route path="/espelho-danos/:id" element={<FormularioEspelhoDanos />} />
          <Route path="/os-manutencao" element={<OsManutencao />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
