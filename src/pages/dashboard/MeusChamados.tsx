import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Ticket } from 'lucide-react'

export default function MeusChamados() {
  const [chamados, setChamados] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('chamados')
      .select('*')
      .order('criado_em', { ascending: false })
      .then(({ data }) => {
        if (data) setChamados(data)
      })
  }, [])

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 animate-fade-in-up">
      <h1 className="text-3xl font-bold tracking-tight">Meus Chamados</h1>
      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {chamados.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Ticket className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Nenhum chamado encontrado para sua conta.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {chamados.map((c) => (
                <li key={c.id} className="border p-4 rounded-md flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{c.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{c.assunto}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      c.status === 'aberto'
                        ? 'bg-blue-100 text-blue-800'
                        : c.status === 'em_atendimento'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {c.status.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
