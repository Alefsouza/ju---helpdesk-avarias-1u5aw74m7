import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, ExternalLink, Move } from 'lucide-react'

export interface DocumentViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url?: string | null
  title?: string | null
}

// Cursor de lupa customizado via SVG data-URI com fallback para zoom-in
// SVG de 24x24 com centro do hotspot na lente (10, 10)
const LUPA_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="6" stroke="#0f172a" fill="rgba(255,255,255,0.4)"/><path d="m14.5 14.5 5.5 5.5"/><path d="M10 7.5v5" stroke="#2563eb"/><path d="M7.5 10h5" stroke="#2563eb"/></svg>`,
)
const LUPA_CURSOR_CSS = `url("data:image/svg+xml,${LUPA_SVG}") 10 10, zoom-in`

export const isImageDocument = (url?: string | null, title?: string | null): boolean => {
  if (!url) return false
  const cleanUrl = url.split('?')[0].toLowerCase()
  const cleanTitle = (title || '').toLowerCase()
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg']
  return (
    imageExtensions.some((ext) => cleanUrl.endsWith(ext)) ||
    imageExtensions.some((ext) => cleanTitle.endsWith(ext))
  )
}

/**
 * Constrói a URL para exibição de PDF embutido sem a interface nativa
 * do navegador (barra de ferramentas no topo e painel de miniaturas à esquerda).
 * No Chrome/Edge/Firefox desktop, os parâmetros Adobe Open Parameters:
 * #toolbar=0&navpanes=0&scrollbar=0 suprimem a barra de ferramentas
 * do topo (toolbar=0) e recolhem o painel lateral de miniaturas (navpanes=0).
 *
 * viewMode:
 * - 'fit-width' (ou isFitWidth=true): '&view=FitH' (ajusta à largura da janela/pop-up)
 * - 'fit-page' (padrão): '&view=Fit' (ajusta a página inteira à visualização padrão)
 */
export const buildPdfViewerUrl = (
  rawUrl?: string | null,
  viewModeOrZoom?: 'Fit' | 'FitH' | number | boolean,
): string => {
  if (!rawUrl) return ''
  // Se a URL já contiver um fragmento (#), remove para aplicar os parâmetros limpos
  const [baseUrl] = rawUrl.split('#')
  // toolbar=0: esconde barra de ferramentas superior
  // navpanes=0: fecha miniaturas/painel de navegação lateral
  let viewParam = '&view=Fit'
  if (viewModeOrZoom === 'FitH' || viewModeOrZoom === true) {
    viewParam = '&view=FitH'
  } else if (typeof viewModeOrZoom === 'number') {
    viewParam = `&zoom=${viewModeOrZoom}`
  } else if (viewModeOrZoom === 'Fit' || viewModeOrZoom === false || !viewModeOrZoom) {
    viewParam = '&view=Fit'
  }
  return `${baseUrl}#toolbar=0&navpanes=0${viewParam}`
}

export function DocumentViewerModal({ open, onOpenChange, url, title }: DocumentViewerModalProps) {
  const [isZoomed, setIsZoomed] = useState(false)
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Reset zoom on document change or open
  useEffect(() => {
    if (open) {
      setIsZoomed(false)
      if (containerRef.current) {
        containerRef.current.scrollLeft = 0
        containerRef.current.scrollTop = 0
      }
    }
  }, [open, url])

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

  const handleDocumentClick = useCallback(() => {
    // Se já estiver com zoom, não faz nada no 1 clique (mantém ampliado)
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
    }
    clickTimeoutRef.current = setTimeout(() => {
      setIsZoomed(true)
      clickTimeoutRef.current = null
    }, 220)
  }, [])

  const handleDocumentDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
    }
    // Duplo clique tira o zoom e reseta a rolagem
    setIsZoomed(false)
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0
      containerRef.current.scrollTop = 0
    }
  }, [])

  // Propaga o evento de roda do mouse (wheel) do overlay para o container ou tenta rolar o iframe
  const handleOverlayWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    // 1. Tenta rolar o conteúdo interno do iframe se for acessível
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.scrollBy({
          top: e.deltaY,
          left: e.deltaX,
          behavior: 'auto',
        })
      }
    } catch {
      // Ignora restrição cross-origin se aplicável
    }

    // 2. Rola o container externo se houver overflow
    if (containerRef.current) {
      containerRef.current.scrollTop += e.deltaY
      containerRef.current.scrollLeft += e.deltaX
    }
  }, [])

  if (!url) return null

  const isImage = isImageDocument(url, title)
  const displayTitle = title || 'Visualização do Documento'
  const pdfViewerSrc = !isImage ? buildPdfViewerUrl(url, isZoomed ? 'FitH' : 'Fit') : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[96vw] h-[94vh] max-h-[94vh] flex flex-col p-3 sm:p-5 gap-2 sm:gap-3 select-none">
        <DialogHeader className="flex flex-row items-center justify-between pr-8 border-b pb-2.5 sm:pb-3 space-y-0 shrink-0 gap-2 flex-wrap">
          <DialogTitle className="text-base sm:text-lg font-semibold truncate flex items-center gap-2 min-w-0 max-w-[70%]">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate" title={displayTitle}>
              {displayTitle}
            </span>
          </DialogTitle>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              title="Abrir documento em nova aba"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Abrir em nova aba</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Dica / instrução sutil */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <span>Clique para dar zoom • Duplo clique para tirar o zoom</span>
          </div>
          {isZoomed && (
            <span className="flex items-center gap-1 font-medium text-primary">
              <Move className="h-3 w-3" /> Role para navegar no documento ampliado
            </span>
          )}
        </div>

        {/* Viewport container */}
        <div
          ref={containerRef}
          className="flex-1 w-full h-full min-h-0 bg-slate-100 dark:bg-slate-900 rounded-md overflow-auto border select-none"
          style={{
            position: 'relative',
            cursor: isZoomed ? 'zoom-out' : LUPA_CURSOR_CSS,
          }}
        >
          {isImage ? (
            <div
              className="min-w-full min-h-full flex items-center justify-center p-4"
              style={{
                width: isZoomed ? '150%' : '100%',
                height: isZoomed ? '150%' : '100%',
                transition: 'width 0.15s ease-out, height 0.15s ease-out',
              }}
            >
              <img
                src={url}
                alt={displayTitle}
                onClick={handleDocumentClick}
                onDoubleClick={handleDocumentDoubleClick}
                draggable={false}
                className="max-w-full max-h-full object-contain rounded shadow-sm select-none transition-transform duration-150 ease-out"
                style={{
                  transform: isZoomed ? 'scale(1.5)' : 'scale(1)',
                  transformOrigin: 'center center',
                  cursor: isZoomed ? 'zoom-out' : LUPA_CURSOR_CSS,
                }}
                title="1 clique: zoom • Duplo clique: tira o zoom"
              />
            </div>
          ) : (
            <div
              className="relative w-full h-full min-w-full min-h-full"
              style={{
                cursor: isZoomed ? 'zoom-out' : LUPA_CURSOR_CSS,
              }}
              title="1 clique: zoom • Duplo clique: tira o zoom"
            >
              {/* Overlay transparente para capturar cliques no PDF sem bloquear o scroll do mouse */}
              {/* Deixa uma margem de 16px à direita para permitir arrastar a barra de rolagem nativa com o mouse */}
              <div
                onClick={handleDocumentClick}
                onDoubleClick={handleDocumentDoubleClick}
                onWheel={handleOverlayWheel}
                className="absolute top-0 bottom-0 left-0 right-4 z-10"
                style={{
                  cursor: isZoomed ? 'zoom-out' : LUPA_CURSOR_CSS,
                }}
                title="1 clique: zoom • Duplo clique: tira o zoom"
              />
              <iframe
                key={isZoomed ? 'pdf-zoomed' : 'pdf-normal'}
                ref={iframeRef}
                src={pdfViewerSrc}
                title={displayTitle}
                className="w-full h-full border-0 rounded bg-white block"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
