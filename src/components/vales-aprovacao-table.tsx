import { useState, useEffect } from 'react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'

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
}

export function ValesAprovacaoTable({
  chamados,
  userId,
  showActions,
  onApproveClick,
  onRejectClick,
}: ValesAprovacaoTableProps) {
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; title: string } | null>(null)
  const [lookupMap, setLookupMap] = useState<CrossLookupMap>(new Map())

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
        <DialogContent className="max-w-[96vw] w-[96vw] h-[94vh] max-h-[94vh] flex flex-col p-3 sm:p-5 gap-2 sm:gap-3">
          <DialogHeader className="flex flex-row items-center justify-between pr-8 border-b pb-2.5 sm:pb-3 space-y-0 shrink-0">
            <DialogTitle className="text-base sm:text-lg font-semibold truncate flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">{selectedDoc?.title || 'Visualização do Documento'}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 w-full h-full min-h-0 bg-slate-100 rounded-md overflow-hidden flex items-center justify-center">
            {selectedDoc &&
              (isImageFile(selectedDoc.url, selectedDoc.title) ? (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-2 sm:p-4">
                  <img
                    src={selectedDoc.url}
                    alt={selectedDoc.title}
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded shadow-sm select-none"
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
