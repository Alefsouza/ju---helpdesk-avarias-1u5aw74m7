import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function SucessoIdoFixo() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="max-w-md w-full bg-background rounded-xl shadow-sm p-8 text-center border">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Formulário Enviado!</h1>
        <p className="text-muted-foreground mb-8">
          O Boletim de Ocorrência IDO foi registrado e salvo com sucesso.
        </p>
        <Button asChild className="w-full" size="lg">
          <Link to="/ido-fixo">Registrar Novo Boletim</Link>
        </Button>
      </div>
    </div>
  )
}
