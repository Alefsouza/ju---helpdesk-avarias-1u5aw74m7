import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DocumentosPendentes() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Documentos Pendentes</h1>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhum documento pendente no momento.</p>
        </CardContent>
      </Card>
    </div>
  )
}
