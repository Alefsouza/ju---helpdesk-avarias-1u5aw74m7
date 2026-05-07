import { CheckCircle2, FileText, Calendar, FileType } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function SucessoIdoFixo() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { fileName?: string; tipo?: string } | null

  const dataAtual = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  const fileName = state?.fileName || 'Documento gerado'
  const tipo = state?.tipo || 'IDO'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Formulário enviado com sucesso</h1>
          <p className="text-slate-500">
            Seu documento foi registrado e está disponível em Documentos
          </p>
        </div>

        <div className="bg-slate-50 border rounded-lg p-4 text-left space-y-3">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-900">Tipo:</span> {tipo}
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-900">Data de envio:</span> {dataAtual}
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600 overflow-hidden">
            <FileType className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-900 shrink-0">Arquivo:</span>
            <span className="truncate" title={fileName}>
              {fileName}
            </span>
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Button className="w-full" onClick={() => navigate('/dashboard/documentos')}>
            Ver documentos
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/ido-fixo')}>
            Preencher outro formulário
          </Button>
        </div>
      </div>
    </div>
  )
}
