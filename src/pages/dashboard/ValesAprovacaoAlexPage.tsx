import { useAuth } from '@/hooks/use-auth'
import { ValesAprovacaoAlex } from '@/components/admin/vales-aprovacao-alex'

export default function ValesAprovacaoAlexPage() {
  const { profile } = useAuth()
  const isPlanejamento = profile?.tipo_usuario === 'planejamento'

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in-up">
      <h1 className="text-3xl font-bold tracking-tight text-slate-800">Vales para Aprovação</h1>
      {isPlanejamento && (
        <p className="text-muted-foreground">
          Aprove ou desapprove chamados antes de enviá-los para a diretoria.
        </p>
      )}
      <ValesAprovacaoAlex />
    </div>
  )
}
