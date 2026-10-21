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

// Dynamic loader for PDF.js library via CDN (version 3.11.174)
const PDFJS_SCRIPT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

let pdfjsLoadPromise: Promise<any> | null = null
function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window unavailable'))
  const win = window as any
  if (win.pdfjsLib) {
    if (!win.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      win.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
    }
    return Promise.resolve(win.pdfjsLib)
  }
  if (!pdfjsLoadPromise) {
    pdfjsLoadPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${PDFJS_SCRIPT_URL}"]`)
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          if (win.pdfjsLib) {
            win.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
            resolve(win.pdfjsLib)
          } else {
            reject(new Error('pdfjsLib not available after script load'))
          }
        })
        existingScript.addEventListener('error', (err) => reject(err))
        return
      }

      const script = document.createElement('script')
      script.src = PDFJS_SCRIPT_URL
      script.async = true
      script.onload = () => {
        if (win.pdfjsLib) {
          win.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
          resolve(win.pdfjsLib)
        } else {
          reject(new Error('pdfjsLib not found on window'))
        }
      }
      script.onerror = (e) => {
        pdfjsLoadPromise = null
        reject(e)
      }
      document.head.appendChild(script)
    })
  }
  return pdfjsLoadPromise
}

interface PdfCanvasRendererProps {
  url: string
  isZoomed: boolean
  onClick: () => void
  onDoubleClick: (e: React.MouseEvent) => void
  displayTitle: string
}

function PdfCanvasRenderer({
  url,
  isZoomed,
  onClick,
  onDoubleClick,
  displayTitle,
}: PdfCanvasRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [viewportWidth, setViewportWidth] = useState<number>(0)
  const [viewportHeight, setViewportHeight] = useState<number>(0)
  const pdfDocRef = useRef<any>(null)
  const renderTasksRef = useRef<Map<number, any>>(new Map())

  // Observa redimensionamento do contêiner
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateSize = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setViewportWidth(rect.width)
        setViewportHeight(rect.height)
      }
    }
    updateSize()
    const ro = new ResizeObserver(() => updateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Carrega o documento PDF com pdf.js
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setNumPages(0)

    // Cancela tasks de renderização anteriores
    renderTasksRef.current.forEach((task) => {
      try {
        task.cancel()
      } catch {
        // ignore
      }
    })
    renderTasksRef.current.clear()

    if (pdfDocRef.current) {
      try {
        pdfDocRef.current.destroy()
      } catch {
        // ignore
      }
      pdfDocRef.current = null
    }

    loadPdfJs()
      .then((pdfjs) => {
        if (cancelled) return
        const loadingTask = pdfjs.getDocument({
          url,
          withCredentials: false,
        })
        return loadingTask.promise
      })
      .then((pdfDoc) => {
        if (cancelled) {
          if (pdfDoc) {
            try {
              pdfDoc.destroy()
            } catch {
              // ignore
            }
          }
          return
        }
        pdfDocRef.current = pdfDoc
        setNumPages(pdfDoc.numPages)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Erro ao carregar PDF via pdf.js:', err)
        setError('Não foi possível renderizar o PDF diretamente.')
        setLoading(false)
      })

    return () => {
      cancelled = true
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel()
        } catch {
          // ignore
        }
      })
      renderTasksRef.current.clear()
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy()
        } catch {
          // ignore
        }
        pdfDocRef.current = null
      }
    }
  }, [url])

  // Se der erro ao carregar via pdf.js (ex.: CSP/rede), faz fallback para iframe nativo
  if (error) {
    const fallbackSrc = buildPdfViewerUrl(url, isZoomed ? 'FitH' : 'Fit')
    return (
      <div
        ref={containerRef}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className="w-full h-full relative"
        style={{ cursor: isZoomed ? 'zoom-out' : LUPA_CURSOR_CSS }}
      >
        <iframe
          src={fallbackSrc}
          title={displayTitle}
          className="w-full h-full border-0 rounded bg-white block"
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className="w-full h-full min-h-full flex flex-col items-center py-4 px-2 sm:px-4 space-y-4 select-none"
      style={{
        cursor: isZoomed ? 'zoom-out' : LUPA_CURSOR_CSS,
      }}
      title="1 clique: zoom • Duplo clique: tira o zoom"
    >
      {loading && (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 min-h-[300px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs">Carregando visualização do PDF...</span>
        </div>
      )}

      {!loading &&
        numPages > 0 &&
        viewportWidth > 0 &&
        viewportHeight > 0 &&
        Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
          <PdfPageCanvas
            key={`${url}-p${pageNum}-${isZoomed ? 'zoomed' : 'normal'}`}
            pdfDoc={pdfDocRef.current}
            pageNum={pageNum}
            containerWidth={viewportWidth}
            containerHeight={viewportHeight}
            isZoomed={isZoomed}
            renderTasksRef={renderTasksRef}
          />
        ))}
    </div>
  )
}

interface PdfPageCanvasProps {
  pdfDoc: any
  pageNum: number
  containerWidth: number
  containerHeight: number
  isZoomed: boolean
  renderTasksRef: React.MutableRefObject<Map<number, any>>
}

function PdfPageCanvas({
  pdfDoc,
  pageNum,
  containerWidth,
  containerHeight,
  isZoomed,
  renderTasksRef,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    let isCancelled = false

    // Cancela renderização pendente desta página se existir
    const prevTask = renderTasksRef.current.get(pageNum)
    if (prevTask) {
      try {
        prevTask.cancel()
      } catch {
        // ignore
      }
      renderTasksRef.current.delete(pageNum)
    }

    pdfDoc
      .getPage(pageNum)
      .then((page: any) => {
        if (isCancelled || !canvasRef.current) return

        // Viewport com escala 1.0 para medir dimensões nativas da página
        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const pageWidth = unscaledViewport.width
        const pageHeight = unscaledViewport.height

        // Margens disponíveis dentro do pop-up
        const horizontalPadding = 32 // margem lateral interna
        const verticalPadding = 32 // margem vertical para caber confortavelmente
        const availWidth = Math.max(containerWidth - horizontalPadding, 200)
        const availHeight = Math.max(containerHeight - verticalPadding, 200)

        // Modo ampliado (1 clique): preenche a largura (fit-width)
        // Modo padrão: cabe na tela (fit-page: menor entre largura e altura)
        let targetScale: number
        if (isZoomed) {
          targetScale = availWidth / pageWidth
        } else {
          const scaleW = availWidth / pageWidth
          const scaleH = availHeight / pageHeight
          // Fit-page: ajustado ao pop-up por inteiro (ambas largura e altura cabem na janela)
          targetScale = Math.min(scaleW, scaleH)
        }

        // Suporte para telas Retina / HiDPI para máxima nitidez (DPR cap em 2)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const renderViewport = page.getViewport({ scale: targetScale * dpr })
        const displayWidth = Math.floor(pageWidth * targetScale)
        const displayHeight = Math.floor(pageHeight * targetScale)

        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = Math.floor(renderViewport.width)
        canvas.height = Math.floor(renderViewport.height)
        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const renderContext = {
          canvasContext: ctx,
          viewport: renderViewport,
        }

        const renderTask = page.render(renderContext)
        renderTasksRef.current.set(pageNum, renderTask)

        return renderTask.promise.then(() => {
          renderTasksRef.current.delete(pageNum)
        })
      })
      .catch((err: any) => {
        if (err?.name === 'RenderingCancelledException') return
        if (!isCancelled) {
          console.warn(`Erro ao renderizar página ${pageNum}:`, err)
        }
      })

    return () => {
      isCancelled = true
      const task = renderTasksRef.current.get(pageNum)
      if (task) {
        try {
          task.cancel()
        } catch {
          // ignore
        }
        renderTasksRef.current.delete(pageNum)
      }
    }
  }, [pdfDoc, pageNum, containerWidth, containerHeight, isZoomed, renderTasksRef])

  return (
    <canvas
      ref={canvasRef}
      className="bg-white rounded shadow-md pointer-events-none transition-shadow"
      style={{
        maxWidth: '100%',
      }}
    />
  )
}

export function DocumentViewerModal({ open, onOpenChange, url, title }: DocumentViewerModalProps) {
  const [isZoomed, setIsZoomed] = useState(false)
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  if (!url) return null

  const isImage = isImageDocument(url, title)
  const displayTitle = title || 'Visualização do Documento'

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
            <PdfCanvasRenderer
              url={url}
              isZoomed={isZoomed}
              onClick={handleDocumentClick}
              onDoubleClick={handleDocumentDoubleClick}
              displayTitle={displayTitle}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
