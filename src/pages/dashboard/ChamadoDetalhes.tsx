import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, HardHat } from 'lucide-react'

export default function ChamadoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>
      <div className="bg-white p-12 rounded-lg border shadow-sm text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <HardHat className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Detalhes do Chamado</h1>
        <p className="text-slate-500 mb-6 max-w-md">
          Esta tela será implementada nos próximos passos, conforme sugerido.
        </p>
        <div className="bg-slate-50 px-4 py-2 rounded-md border text-sm text-slate-600 font-mono">
          ID: {id}
        </div>
      </div>
    </div>
  )
}
