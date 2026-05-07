import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function SucessoEspelhoDanosFixo() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Formulário Enviado!</h1>
          <p className="text-slate-500">
            O formulário de Espelho de Danos foi registrado com sucesso e o documento foi gerado e
            salvo no sistema.
          </p>
        </div>

        <div className="pt-4 space-y-3">
          <Button className="w-full" onClick={() => navigate('/espelho-danos-fixo')}>
            Preencher novo formulário
          </Button>
        </div>
      </div>
    </div>
  )
}
