import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function SucessoIdo() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <CheckCircle2 className="w-20 h-20 text-green-500 mb-6" />
      <h1 className="text-3xl font-bold mb-2">Formulário enviado com sucesso</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        O formulário de identificação foi registrado e vinculado ao chamado com sucesso. Você já
        pode fechar esta página.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao Início</Link>
      </Button>
    </div>
  )
}
