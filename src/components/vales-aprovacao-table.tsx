import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FileText, FileSignature, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

  return {
    registro: espelhoData?.registro_motorista || chamado.registro_motorista || '-',
    nome: espelhoData?.nome_motorista || chamado.nome_motorista || '-',
  }
}

const getOrcamentoUrl = (chamado: any) => {
  // 1. Procurar na lista de documentos
  if (chamado.documentos && Array.isArray(chamado.documentos) && chamado.documentos.length > 0) {
    const orcamentos = chamado.documentos.filter(
      (d: any) =>
        isOrcamento(d.tipo_documento) || isOrcamento(d.nome_arquivo) || Boolean(d.orcamento_url),
    )
    if (orcamentos.length > 0) {
      const url = orcamentos[0].orcamento_url || orcamentos[0].arquivo_url
      if (url) return url
    }
  }

  // 2. Fallback: procurar em anexos_chamado_interno
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
                    {(chamado.departamentoFinalizador === 'Jurídico' ||
                      chamado.departamentoFinalizador === 'Sinistro') && (
                      <Badge
                        variant="outline"
                        className="w-fit bg-green-100 text-green-800 border-green-300"
                      >
                        {chamado.departamentoFinalizador}
                      </Badge>
                    )}
                  </div>
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
                      <a
                        href={orcamentoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[150px]">Orçamento</span>
                      </a>
                    )}
                    {relevantAnexos.map((anexo: any) => (
                      <a
                        key={anexo.id}
                        href={anexo.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <FileSignature className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {normalizeAttachmentLabel(anexo.nome_arquivo)}
                        </span>
                      </a>
                    ))}
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
    </div>
  )
}
