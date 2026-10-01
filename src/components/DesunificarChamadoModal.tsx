import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Unlink, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface DesunificarChamadoModalProps {
  isOpen: boolean
  onClose: () => void
  chamado: {
    id: string
    titulo: string
    pia?: string
    status?: string
    descricao?: string
    unificado_em_chamado_id?: string | null
  } | null
  onSuccess: () => void
}

export function DesunificarChamadoModal({
  isOpen,
  onClose,
  chamado,
  onSuccess,
}: DesunificarChamadoModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [destinoTitulo, setDestinoTitulo] = useState<string | null>(null)
  const [destinoId, setDestinoId] = useState<string | null>(null)
  const [loadingDestino, setLoadingDestino] = useState(false)

  useEffect(() => {
    if (!isOpen || !chamado) {
      setDestinoTitulo(null)
      setDestinoId(null)
      return
    }

    const fetchDestinoInfo = async () => {
      setLoadingDestino(true)
      try {
        let destId: string | null = chamado.unificado_em_chamado_id || null

        if (!destId && chamado.descricao) {
          const match = chamado.descricao.match(
            /\[SISTEMA\]: Este chamado foi unificado com o chamado destino #([0-9a-fA-F-]{36})/i,
          )
          if (match && match[1]) {
            destId = match[1]
          }
        }

        if (destId) {
          setDestinoId(destId)
          const { data } = await supabase
            .from('chamados')
            .select('titulo')
            .eq('id', destId)
            .maybeSingle()
          if (data?.titulo) {
            setDestinoTitulo(data.titulo)
          }
        }
      } catch (err) {
        console.error('Erro ao buscar destino da unificação:', err)
      } finally {
        setLoadingDestino(false)
      }
    }

    fetchDestinoInfo()
  }, [isOpen, chamado])

  const handleDesunificar = async () => {
    if (!chamado) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('desunificar-chamados', {
        body: {
          origem_id: chamado.id,
        },
      })

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Erro ao desunificar chamado')
      }

      const moved = data?.moved_items || {}
      const movedCount =
        (moved.anexos_chamado_interno || 0) +
        (moved.anexos_chamado || 0) +
        (moved.documentos || 0) +
        (moved.formularios_espelho_danos || 0) +
        (moved.formularios_ido || 0)

      toast.success(
        `Chamado desunificado com sucesso! Status retornado para Finalizado.${
          movedCount > 0 ? ` ${movedCount} item(ns) devolvido(s).` : ''
        }`,
      )
      onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao desunificar chamado. Verifique as permissões.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <AlertDialogContent className="sm:max-w-[540px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <Unlink className="h-5 w-5" />
            <AlertDialogTitle className="text-slate-900">Desunificar Chamado</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-600 text-left pt-2 space-y-3">
            <p>
              Tem certeza que deseja desunificar este chamado? Esta ação executará a devolução
              completa dos registros.
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border text-xs text-slate-700 space-y-1.5">
              <div>
                <span className="font-semibold text-slate-900">Chamado de Origem: </span>
                {chamado?.titulo}
              </div>
              <div className="text-slate-500 flex gap-3">
                <span>ID: {chamado?.id?.substring(0, 8)}...</span>
                {chamado?.pia && <span>RA: {chamado.pia}</span>}
              </div>

              {(destinoTitulo || destinoId) && (
                <div className="pt-1 border-t border-slate-200 mt-1">
                  <span className="font-semibold text-slate-900">Chamado Destino Vinculado: </span>
                  {loadingDestino ? (
                    <span className="text-slate-400">Carregando...</span>
                  ) : (
                    <span>
                      {destinoTitulo || 'Desconhecido'} (ID: {destinoId?.substring(0, 8)}...)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-md text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                <span>O que será feito:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-amber-800">
                <li>
                  Devolver ao chamado de origem todos os seus documentos, anexos internos, espelhos
                  de danos e históricos.
                </li>
                <li>Restaurar a descrição original de ambos os chamados.</li>
                <li>
                  Retornar o status do chamado de origem para <strong>Finalizado</strong>{' '}
                  (habilitado para fluxo de vales).
                </li>
                <li>Registrar o evento de desunificação no histórico para auditoria.</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDesunificar()
            }}
            disabled={submitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? 'Desunificando...' : 'Confirmar Desunificação'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
