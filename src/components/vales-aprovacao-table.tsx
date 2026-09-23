import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FileText, FileSignature, Check, X, ExternalLink, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

const stripAccents = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const RELEVANT_ATTACHMENT_KEYWORDS = [
  'vale',
  'autorização',
  'autorizacao',
  'escaneado',
  'nf',
  'nota fiscal',
  'boleto',
  'recibo',
  'quitação',
  'quitacao',
  'orçamento',
  'orcamento',
]

const isOrcamento = (nameOrType?: string): boolean => {
  if (!nameOrType) return false
  const normalized = stripAccents(nameOrType)
  return normalized.includes('orcamento')
}

const isRelevantAttachment = (anexo: any) => {
  const nome = stripAccents(anexo.nome_arquivo || '')
  return RELEVANT_ATTACHMENT_KEYWORDS.some((kw) => nome.includes(stripAccents(kw)))
}

const normalizeAttachmentLabel = (nomeArquivo: string): string => {
  const nome = stripAccents(nomeArquivo || '')
  if (nome.includes('orcamento')) return 'Orçamento'
  if (nome.includes('nf') || nome.includes('nota fiscal')) return 'Nota Fiscal'
  if (nome.includes('boleto')) return 'Boleto'
  if (nome.includes('recibo') || nome.includes('quitacao')) return 'Recibo de Quitação'
  return 'Autorização de Desconto'
}

const getDriverData = (chamado: any) => {
  const espelhoData = Array.isArray(chamado.formularios_espelho_danos)
    ? chamado.formularios_espelho_danos[0]
    : chamado.formularios_espelho_danos

  const docVale = Array.isArray(chamado.documentos)
    ? chamado.documentos.find(
        (d: any) => d.tipo_documento === 'Vale' && (d.registro_motorista || d.nome_motorista),
      )
    : null

  return {
    registro:
      espelhoData?.registro_motorista ||
      docVale?.registro_motorista ||
      chamado.registro_motorista ||
      '-',
    nome: espelhoData?.nome_motorista || docVale?.nome_motorista || chamado.nome_motorista || '-',
  }
}

const getOrcamentoUrl = (chamado: any) => {
  // Link de Orçamento deve vir SOMENTE dos anexos internos do chamado (anexos_chamado_interno)
  if (
    chamado.anexos_chamado_interno &&
    Array.isArray(chamado.anexos_chamado_interno) &&
    chamado.anexos_chamado_interno.length > 0
  ) {
    const anexoOrcamento = chamado.anexos_chamado_interno.find((a: any) =>
      isOrcamento(a.nome_arquivo),
    )
    if (anexoOrcamento?.arquivo_url) {
      return anexoOrcamento.arquivo_url
    }
  }

  return null
}

interface ValesAprovacaoTableProps {
  chamados: any[]
  userId: string
  showActions: boolean
  onApproveClick: (chamado: any) => void
  onRejectClick: (chamado: any) => void
}

export function ValesAprovacaoTable({
  chamados,
  userId,
  showActions,
  onApproveClick,
  onRejectClick,
}: ValesAprovacaoTableProps) {
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; title: string } | null>(null)

  const isImageFile = (url: string, title?: string): boolean => {
    const cleanUrl = url.split('?')[0].toLowerCase()
    const cleanTitle = (title || '').toLowerCase()
    return (
      cleanUrl.endsWith('.jpg') ||
      cleanUrl.endsWith('.jpeg') ||
      cleanUrl.endsWith('.png') ||
      cleanUrl.endsWith('.webp') ||
      cleanUrl.endsWith('.gif') ||
      cleanTitle.endsWith('.jpg') ||
      cleanTitle.endsWith('.jpeg') ||
      cleanTitle.endsWith('.png') ||
      cleanTitle.endsWith('.webp') ||
      cleanTitle.endsWith('.gif')
    )
  }

  const handleOpenDoc = (url: string, title: string) => {
    setSelectedDoc({ url, title })
  }
  if (chamados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Check className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Nenhum vale neste estado</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Chamado</TableHead>
            <TableHead>PIA</TableHead>
            <TableHead>Registro do Motorista</TableHead>
            <TableHead>Nome do Motorista</TableHead>
            <TableHead>Data da Ocorrência</TableHead>
            <TableHead>Aprovações</TableHead>
            <TableHead>Documentos</TableHead>
            {showActions && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {chamados.map((chamado) => {
            const driver = getDriverData(chamado)
            const orcamentoUrl = getOrcamentoUrl(chamado)
            const aprovacoes = Array.isArray(chamado.aprovacoes_diretoria)
              ? chamado.aprovacoes_diretoria
              : []
            const relevantAnexos = (chamado.anexos_chamado_interno || []).filter((anexo: any) => {
              // Se o anexo interno for o próprio orçamento exibido no link principal de Orçamento, evita duplicar
              if (orcamentoUrl && anexo.arquivo_url === orcamentoUrl) {
                return false
              }
              return isRelevantAttachment(anexo)
            })

            return (
              <TableRow key={chamado.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Link
                      to={`/dashboard/chamados/${chamado.id}`}
                      className="font-medium text-primary hover:underline transition-colors"
                    >
                      {chamado.titulo || '-'}
                    </Link>
                    {(() => {
                      const dep = stripAccents(chamado.departamento_finalizador || '')
                      const isJuridico = dep.includes('juridico')
                      const isSinistro = dep.includes('sinistro')

                      if (isJuridico) {
                        return (
                          <Badge
                            variant="outline"
                            className="w-fit rounded-full text-xs font-medium px-2.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                          >
                            Jurídico
                          </Badge>
                        )
                      }

                      if (isSinistro) {
                        return (
                          <Badge
                            variant="outline"
                            className="w-fit rounded-full text-xs font-medium px-2.5 py-0.5 bg-green-50 text-green-700 border-green-200"
                          >
                            Sinistro
                          </Badge>
                        )
                      }

                      return null
                    })()}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm text-slate-700">
                  {chamado.pia || '-'}
                </TableCell>
                <TableCell>{driver.registro}</TableCell>
                <TableCell>{driver.nome}</TableCell>
                <TableCell>
                  {chamado.data_ocorrencia
                    ? format(new Date(chamado.data_ocorrencia + 'T12:00:00'), 'dd/MM/yyyy')
                    : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        aprovacoes.filter((a: any) => a.acao === 'aprovado' || !a.acao).length > 0
                          ? 'bg-green-500'
                          : 'bg-yellow-500'
                      }`}
                    />
                    <span>
                      {aprovacoes.filter((a: any) => a.acao === 'aprovado' || !a.acao).length}
                      /2 Aprov.
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {orcamentoUrl && (
                      <button
                        type="button"
                        onClick={() => handleOpenDoc(orcamentoUrl, 'Orçamento')}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline text-left cursor-pointer transition-colors"
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[150px]">Orçamento</span>
                      </button>
                    )}
                    {relevantAnexos.map((anexo: any) => {
                      const label = normalizeAttachmentLabel(anexo.nome_arquivo)
                      return (
                        <button
                          key={anexo.id}
                          type="button"
                          onClick={() =>
                            handleOpenDoc(anexo.arquivo_url, anexo.nome_arquivo || label)
                          }
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline text-left cursor-pointer transition-colors"
                        >
                          <FileSignature className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[150px]">{label}</span>
                        </button>
                      )
                    })}
                    {!orcamentoUrl && relevantAnexos.length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhum anexo</span>
                    )}
                  </div>
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    {(() => {
                      const userAprovacao = aprovacoes.find((a: any) => a.usuario_id === userId)
                      if (userAprovacao) {
                        const isAprovado = userAprovacao.acao === 'aprovado' || !userAprovacao.acao
                        return (
                          <div className="flex justify-end items-center h-full min-h-[40px]">
                            <span
                              className={`text-sm font-medium px-2 py-1 rounded-md ${
                                isAprovado ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {isAprovado ? 'Aprovado por você' : 'Recusado por você'}
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                onClick={() => onApproveClick(chamado)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Aprovar</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={() => onRejectClick(chamado)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Recusar</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )
                    })()}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog
        open={!!selectedDoc}
        onOpenChange={(open) => {
          if (!open) setSelectedDoc(null)
        }}
      >
        <DialogContent className="max-w-4xl w-[95vw] sm:max-w-4xl h-[85vh] flex flex-col p-4 sm:p-6 gap-3">
          <DialogHeader className="flex flex-row items-center justify-between pr-8 border-b pb-3 space-y-0">
            <DialogTitle className="text-base sm:text-lg font-semibold truncate flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">{selectedDoc?.title || 'Visualização do Documento'}</span>
            </DialogTitle>
            <div className="flex items-center gap-1 shrink-0">
              {selectedDoc?.url && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <a
                      href={selectedDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden sm:inline">Nova aba</span>
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <a
                      href={selectedDoc.url}
                      download={selectedDoc.title || 'documento'}
                      title="Baixar arquivo"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden sm:inline">Baixar</span>
                    </a>
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 w-full h-full min-h-0 bg-slate-100 rounded-md overflow-hidden flex items-center justify-center">
            {selectedDoc &&
              (isImageFile(selectedDoc.url, selectedDoc.title) ? (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                  <img
                    src={selectedDoc.url}
                    alt={selectedDoc.title}
                    className="max-w-full max-h-full object-contain rounded shadow-sm"
                  />
                </div>
              ) : (
                <iframe
                  src={selectedDoc.url}
                  title={selectedDoc.title}
                  className="w-full h-full border-0 rounded"
                />
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
