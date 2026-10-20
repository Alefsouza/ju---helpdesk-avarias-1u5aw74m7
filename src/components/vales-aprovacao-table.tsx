import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FileText, FileSignature, Check, X, ShieldAlert, AlertTriangle } from 'lucide-react'
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
import { supabase } from '@/lib/supabase/client'
import { DocumentViewerModal } from '@/components/DocumentViewerModal'

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

// Localiza o documento de Vale / Autorização de Desconto com prioridades e fallbacks idênticos ao DP
const getDocVale = (chamado: any) => {
  if (
    !chamado ||
    !chamado.documentos ||
    !Array.isArray(chamado.documentos) ||
    chamado.documentos.length === 0
  ) {
    return null
  }
  const docs = chamado.documentos
  const docTipo = docs.find((d: any) => {
    const t = (d.tipo_documento || '').toLowerCase()
    return (
      t === 'vale' ||
      t === 'autorizacao_desconto' ||
      t === 'autorização_desconto' ||
      t === 'autorizacao'
    )
  })
  if (docTipo) return docTipo

  const docNome = docs.find((d: any) => {
    const n = (d.nome_arquivo || '').toLowerCase()
    return (
      n.includes('autorizacao') ||
      n.includes('autorização') ||
      n.includes('desconto') ||
      n.includes('vale')
    )
  })
  return docNome || null
}

export type CrossLookupMap = Map<string, { registro: string; garagem?: string }>

export const getDriverData = (chamado: any, lookupMap?: CrossLookupMap) => {
  const espelhoData = Array.isArray(chamado.formularios_espelho_danos)
    ? chamado.formularios_espelho_danos[0]
    : chamado.formularios_espelho_danos

  const solicitacaoData = Array.isArray(chamado.solicitacoes_parcelamento)
    ? chamado.solicitacoes_parcelamento[0]
    : chamado.solicitacoes_parcelamento

  const docVale = getDocVale(chamado)

  // Cadeia de resolução de nome (DP / ValesAprovadosDP)
  const resolvedNome =
    solicitacaoData?.nome ||
    espelhoData?.nome_motorista ||
    docVale?.nome_motorista ||
    docVale?.nome_responsavel ||
    chamado.nome_motorista ||
    null

  // Busca cruzada na tabela de registros se houver nome e registro ausente
  let lookupReg: string | null = null
  let lookupGaragem: string | null = null
  if (resolvedNome && lookupMap) {
    const info = lookupMap.get(resolvedNome.trim().toLowerCase())
    if (info) {
      lookupReg = info.registro || null
      lookupGaragem = info.garagem || null
    }
  }

  // Cadeia de resolução de registro
  const resolvedRegistro =
    solicitacaoData?.registro ||
    espelhoData?.registro_motorista ||
    docVale?.registro_motorista ||
    docVale?.registro_responsavel ||
    lookupReg ||
    chamado.registro_motorista ||
    null

  const cleanReg =
    resolvedRegistro && String(resolvedRegistro).trim() && String(resolvedRegistro).trim() !== 'N/A'
      ? String(resolvedRegistro).trim()
      : '-'

  const cleanNome =
    resolvedNome && String(resolvedNome).trim() && String(resolvedNome).trim() !== 'N/A'
      ? String(resolvedNome).trim()
      : '-'

  return {
    registro: cleanReg,
    nome: cleanNome,
    garagem: lookupGaragem,
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
  lastViewedChamadoId?: string | null
  onDocumentView?: (chamadoId: string) => void
}

export function ValesAprovacaoTable({
  chamados,
  userId,
  showActions,
  onApproveClick,
  onRejectClick,
  lastViewedChamadoId,
  onDocumentView,
}: ValesAprovacaoTableProps) {
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; title: string } | null>(null)
  const [internalLastViewedChamadoId, setInternalLastViewedChamadoId] = useState<string | null>(
    null,
  )
  const [lookupMap, setLookupMap] = useState<CrossLookupMap>(new Map())

  // Usa lastViewedChamadoId compartilhado se fornecido via prop, senão estado interno
  const activeLastViewedId =
    lastViewedChamadoId !== undefined ? lastViewedChamadoId : internalLastViewedChamadoId

  // Busca cruzada na tabela 'registros' para colaboradores cujo chamado não trouxe registro mas possui nome
  useEffect(() => {
    let isMounted = true

    const fetchMissingRegistros = async () => {
      const namesToLookup = new Set<string>()

      for (const chamado of chamados) {
        const espelhoData = Array.isArray(chamado.formularios_espelho_danos)
          ? chamado.formularios_espelho_danos[0]
          : chamado.formularios_espelho_danos

        const solicitacaoData = Array.isArray(chamado.solicitacoes_parcelamento)
          ? chamado.solicitacoes_parcelamento[0]
          : chamado.solicitacoes_parcelamento

        const docVale = getDocVale(chamado)

        const existingReg =
          solicitacaoData?.registro ||
          espelhoData?.registro_motorista ||
          docVale?.registro_motorista ||
          docVale?.registro_responsavel ||
          chamado.registro_motorista

        const hasValidReg =
          existingReg &&
          String(existingReg).trim() &&
          String(existingReg).trim() !== 'N/A' &&
          String(existingReg).trim() !== '-'

        if (!hasValidReg) {
          const candNome =
            solicitacaoData?.nome ||
            espelhoData?.nome_motorista ||
            docVale?.nome_motorista ||
            docVale?.nome_responsavel ||
            chamado.nome_motorista

          if (
            candNome &&
            String(candNome).trim() &&
            String(candNome).trim() !== 'N/A' &&
            String(candNome).trim() !== '-'
          ) {
            namesToLookup.add(String(candNome).trim())
          }
        }
      }

      if (namesToLookup.size === 0) {
        return
      }

      const newMap: CrossLookupMap = new Map()

      for (const name of namesToLookup) {
        try {
          const { data: regRows } = await (supabase.from('registros') as any)
            .select('registro, nome, garagem_colaborador')
            .ilike('nome', `%${name}%`)
            .limit(5)

          if (regRows && regRows.length > 0) {
            const exact =
              regRows.find((r: any) => r.nome?.toLowerCase() === name.toLowerCase()) || regRows[0]
            if (exact && exact.registro) {
              const regVal = String(exact.registro).trim()
              newMap.set(name.toLowerCase(), {
                registro: regVal,
                garagem: exact.garagem_colaborador || undefined,
              })
            }
          }
        } catch {
          /* intentionally ignored */
        }
      }

      if (isMounted && newMap.size > 0) {
        setLookupMap((prev) => {
          const merged = new Map(prev)
          newMap.forEach((val, key) => merged.set(key, val))
          return merged
        })
      }
    }

    fetchMissingRegistros()

    return () => {
      isMounted = false
    }
  }, [chamados])

  const handleOpenDoc = (url: string, title: string, chamadoId?: string) => {
    setSelectedDoc({ url, title })
    if (chamadoId) {
      setInternalLastViewedChamadoId(chamadoId)
      if (onDocumentView) {
        onDocumentView(chamadoId)
      }
    }
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
            const driver = getDriverData(chamado, lookupMap)
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

            const isLastViewed = activeLastViewedId === chamado.id

            return (
              <TableRow
                key={chamado.id}
                className={`transition-colors ${
                  isLastViewed
                    ? 'border-l-2 border-l-emerald-500 bg-emerald-500/[0.05] dark:border-l-emerald-400 dark:bg-emerald-500/[0.08]'
                    : ''
                }`}
              >
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Link
                      to={`/dashboard/chamados/${chamado.id}`}
                      className="font-medium text-primary hover:underline transition-colors"
                    >
                      {chamado.titulo || '-'}
                    </Link>
                    {chamado.em_restricao && (
                      <div className="flex flex-col gap-1 mt-0.5">
                        <Badge
                          variant="outline"
                          className="w-fit rounded-full text-xs font-semibold px-2.5 py-0.5 bg-amber-100 text-amber-900 border-amber-300 flex items-center gap-1"
                        >
                          <ShieldAlert className="h-3 w-3 text-amber-700 shrink-0" />
                          {chamado.restricao_motivo === 'Pendente de Aprovação de Desconto'
                            ? 'Jurídico - Pendente Aprovação de Desconto'
                            : 'Jurídico - Restrição'}
                        </Badge>
                        {chamado.restricao_motivo && (
                          <span className="text-xs font-medium text-amber-900">
                            Motivo: {chamado.restricao_motivo}
                          </span>
                        )}
                        {chamado.restricao_observacao && (
                          <span
                            className="text-xs text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 whitespace-pre-wrap max-w-sm"
                            title={chamado.restricao_observacao}
                          >
                            Obs: {chamado.restricao_observacao}
                          </span>
                        )}
                      </div>
                    )}
                    {!chamado.em_restricao && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
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
                        {Boolean(
                          chamado.restricao_removida_em ||
                          chamado.restricao_motivo ||
                          chamado.restricao_observacao,
                        ) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                tabIndex={0}
                                role="button"
                                aria-label="Alerta de restrição anterior"
                                className="inline-flex items-center text-amber-600 hover:text-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded p-0.5 cursor-help"
                              >
                                <AlertTriangle className="h-4 w-4 fill-amber-400 text-amber-700 shrink-0" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs p-3 text-xs space-y-1.5 bg-slate-900 text-slate-100 border-slate-800 shadow-lg">
                              <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                Chamado já teve restrição do Jurídico
                              </p>
                              {chamado.restricao_motivo && (
                                <p className="text-slate-200">
                                  <strong className="text-slate-100">Motivo:</strong>{' '}
                                  {chamado.restricao_motivo}
                                </p>
                              )}
                              {chamado.restricao_observacao && (
                                <p className="text-slate-200 whitespace-pre-wrap">
                                  <strong className="text-slate-100">Observação:</strong>{' '}
                                  {chamado.restricao_observacao}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    )}
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
                        onClick={() => handleOpenDoc(orcamentoUrl, 'Orçamento', chamado.id)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline text-left cursor-pointer"
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
                            handleOpenDoc(
                              anexo.arquivo_url,
                              anexo.nome_arquivo || label,
                              chamado.id,
                            )
                          }
                          className="flex items-center gap-1 text-xs text-primary hover:underline text-left cursor-pointer"
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

      <DocumentViewerModal
        open={!!selectedDoc}
        onOpenChange={(open) => {
          if (!open) setSelectedDoc(null)
        }}
        url={selectedDoc?.url}
        title={selectedDoc?.title}
      />
    </div>
  )
}
