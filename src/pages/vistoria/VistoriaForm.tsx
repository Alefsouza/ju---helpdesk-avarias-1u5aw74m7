import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function VistoriaForm() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nova Vistoria</h1>
      <Card>
        <CardHeader>
          <CardTitle>Formulário de Vistoria</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Formulário de vistoria em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  )
}
