import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function SucessoCoc() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in-up">
      <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-6" />
      <h1 className="text-3xl font-bold text-slate-800 mb-2">Chamado aberto com sucesso!</h1>
      <p className="text-slate-600 mb-8 max-w-md">
        Seu registro foi enviado e está com o status Pendente. A equipe responsável analisará em
        breve.
      </p>
      <Button asChild size="lg" className="bg-[#225f3d] hover:bg-[#1a4a2f]">
        <Link to="/coc/novo">Voltar para Abrir Chamado</Link>
      </Button>
    </div>
  )
}
