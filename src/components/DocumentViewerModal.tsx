import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, ZoomIn, ZoomOut, RotateCcw, Maximize2, ExternalLink, Move } from 'lucide-react'

export interface DocumentViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url?: string | null
  title?: string | null
}

const ZOOM_MIN = 50
const ZOOM_MAX = 350
const ZOOM_STEP = 25
const ZOOM_DEFAULT = 100

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

export function DocumentViewerModal({ open, onOpenChange, url, title }: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState<number>(ZOOM_DEFAULT)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset zoom on document change or open
  useEffect(() => {
    if (open) {
      setZoom(ZOOM_DEFAULT)
      if (containerRef.current) {
        containerRef.current.scrollLeft = 0
        containerRef.current.scrollTop = 0
      }
    }
  }, [open, url])

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(ZOOM_MAX, prev + ZOOM_STEP))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(ZOOM_MIN, prev - ZOOM_STEP))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoom(ZOOM_DEFAULT)
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0
      containerRef.current.scrollTop = 0
    }
  }, [])

  const handleDocumentClick = useCallback(() => {
    setZoom((prev) => {
      // Se já estiver ampliado, não acumula mais no clique simples
      if (prev > ZOOM_DEFAULT) {
        return prev
      }
      // Primeiro clique amplia para um nível de zoom único confortável
      return 150
    })
  }, [])

  const handleDocumentDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      handleResetZoom()
    },
    [handleResetZoom],
  )

  // Pan handlers for dragging zoomed container
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with primary left mouse button
    if (e.button !== 0) return
    const container = containerRef.current
    if (!container) return

    setIsPanning(true)
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPanning || !containerRef.current) return
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      containerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx
      containerRef.current.scrollTop = panStartRef.current.scrollTop - dy
    },
    [isPanning],
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  if (!url) return null

  const isImage = isImageDocument(url, title)
  const displayTitle = title || 'Visualização do Documento'
  const isZoomed = zoom !== 100

  // For PDF via iframe: appending #zoom=... where supported,
  // plus applying a responsive scaled viewport container
  const pdfUrlWithZoom = (() => {
    if (isImage) return url
    const clean = url.split('#')[0]
    return `${clean}#zoom=${zoom}`
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[96vw] h-[94vh] max-h-[94vh] flex flex-col p-3 sm:p-5 gap-2 sm:gap-3 select-none">
        <DialogHeader className="flex flex-row items-center justify-between pr-8 border-b pb-2.5 sm:pb-3 space-y-0 shrink-0 gap-2 flex-wrap">
          <DialogTitle className="text-base sm:text-lg font-semibold truncate flex items-center gap-2 min-w-0 max-w-[50%]">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate" title={displayTitle}>
              {displayTitle}
            </span>
          </DialogTitle>

          {/* Barra de ferramentas de Zoom */}
          <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40"
              onClick={handleZoomOut}
              disabled={zoom <= ZOOM_MIN}
              title="Afastar zoom (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-0.5 min-w-[52px] text-xs font-mono font-medium rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title="Clique para redefinir para 100%"
            >
              {zoom}%
            </button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40"
              onClick={handleZoomIn}
              disabled={zoom >= ZOOM_MAX}
              title="Aproximar zoom (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600 mx-0.5" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
              onClick={handleResetZoom}
              title="Redefinir zoom (100%)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              title="Abrir documento em nova aba"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Dica / instrução sutil */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            {isImage ? (
              <span>Clique na imagem para aproximar • Duplo clique para redefinir</span>
            ) : (
              <span>
                Clique para aproximar • Duplo clique para redefinir (ou use os controles do PDF)
              </span>
            )}
          </div>
          {isZoomed && (
            <span className="flex items-center gap-1 font-medium text-primary">
              <Move className="h-3 w-3" /> Arraste para mover / role para navegar
            </span>
          )}
        </div>

        {/* Viewport container com scroll / pan */}
        <div
          ref={containerRef}
          onMouseDown={isZoomed ? handleMouseDown : undefined}
          onMouseMove={isZoomed ? handleMouseMove : undefined}
          onMouseUp={isZoomed ? handleMouseUp : undefined}
          onMouseLeave={isZoomed ? handleMouseUp : undefined}
          className={`flex-1 w-full h-full min-h-0 bg-slate-100 dark:bg-slate-900 rounded-md overflow-auto border select-none ${
            isPanning ? 'cursor-grabbing' : ''
          }`}
          style={{
            position: 'relative',
            cursor: isPanning ? 'grabbing' : isZoomed ? 'grab' : LUPA_CURSOR_CSS,
          }}
        >
          {isImage ? (
            <div
              className="min-w-full min-h-full flex items-center justify-center p-4"
              style={{
                // Quando o zoom > 100%, expandir a área para permitir rolagem confortável
                width: zoom > 100 ? `${zoom}%` : '100%',
                height: zoom > 100 ? `${zoom}%` : '100%',
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
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                  cursor: isPanning ? 'grabbing' : isZoomed ? 'grab' : LUPA_CURSOR_CSS,
                }}
                title="Clique para aproximar • Duplo clique para redefinir"
              />
            </div>
          ) : (
            <div
              onClick={handleDocumentClick}
              onDoubleClick={handleDocumentDoubleClick}
              className="w-full h-full flex items-center justify-center overflow-auto"
              style={{
                // Para PDF, aplicar transform scale no container do iframe e redimensionar proporções
                width: zoom > 100 ? `${zoom}%` : '100%',
                height: zoom > 100 ? `${zoom}%` : '100%',
                minWidth: '100%',
                minHeight: '100%',
                transition: 'width 0.15s ease-out, height 0.15s ease-out',
                cursor: isPanning ? 'grabbing' : isZoomed ? 'grab' : LUPA_CURSOR_CSS,
              }}
              title="Clique para aproximar • Duplo clique para redefinir"
            >
              <div
                className="w-full h-full relative"
                style={{
                  transform: zoom < 100 ? `scale(${zoom / 100})` : 'none',
                  transformOrigin: 'top left',
                  width: zoom < 100 ? `${(100 / zoom) * 100}%` : '100%',
                  height: zoom < 100 ? `${(100 / zoom) * 100}%` : '100%',
                }}
              >
                <iframe
                  key={`${url}-${zoom}`}
                  src={pdfUrlWithZoom}
                  title={displayTitle}
                  className="w-full h-full border-0 rounded bg-white pointer-events-auto"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
