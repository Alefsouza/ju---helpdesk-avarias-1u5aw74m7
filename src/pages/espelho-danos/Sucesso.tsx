import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SucessoEspelhoDanos() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Formulário Enviado</CardTitle>
          <CardDescription>
            O formulário de espelho de danos foi registrado com sucesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Você já pode fechar esta página.</p>
        </CardContent>
      </Card>
    </div>
  )
}
