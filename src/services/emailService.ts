// Serviço de e-mail do Helpdesk — replica o padrão do Arquivo Via Sudeste (projeto 57157).
// Disparo NÃO-bloqueante: se o e-mail falhar, o fluxo principal continua e o usuário
// não vê erro (só loga no console).
import { supabase } from '@/lib/supabase/client'

export const EMAIL_ANEXO_DESTINATARIOS_PADRAO = [
  'luiz.gabriel@viasudeste.com',
  'alef.silva@viasudeste.com',
  'maria.rodrigues@viasudeste.com',
]

export interface EmailAnexoValePayload {
  chamadoId: string
  titulo?: string | null
  pia?: string | null
  carro?: string | null
  statusChamado?: string | null
  documento: string // 'Vale' | 'Autorização de Desconto'
  anexadoPorNome?: string | null
  anexadoPorEmail?: string | null
  anexadoEm?: string
  observacoes?: string | null
  destinatario?: string | string[] | null
}

function isValeOuAutorizacao(nomeArquivo: string): string | null {
  const nome = (nomeArquivo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (nome.includes('autorizacao de desconto') || nome.includes('autorizacao_desconto')) {
    return 'Autorização de Desconto'
  }
  if (nome.includes('vale')) return 'Vale'
  if (nome.includes('autorizacao')) return 'Autorização de Desconto'
  return null
}

/** Classifica um anexo interno pelo nome do arquivo (Vale ou Autorização de Desconto). */
export function tipoDocumentoAnexo(nomeArquivo: string): string | null {
  return isValeOuAutorizacao(nomeArquivo)
}

/** Chamado está em Restrição ou Pendente de Aprovação de Desconto? */
export function chamadoEstaEmRestricaoOuPendenteDesconto(chamado: any): boolean {
  if (!chamado) return false
  if (chamado.em_restricao === true) return true
  const motivo = String(chamado.restricao_motivo || '').trim()
  return motivo === 'Pendente de Aprovação de Desconto'
}

/**
 * Dispara o e-mail de anexo de Vale/Autorização de Desconto (fire-and-forget).
 * Import dinâmico dentro de try — um erro de módulo não derruba o fluxo principal.
 */
export async function dispararEmailAnexoVale(payload: EmailAnexoValePayload): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) {
      console.warn('E-mail do anexo não enviado: usuário sem sessão')
      return
    }

    const body = {
      tipo: 'anexo_vale',
      chamadoId: payload.chamadoId,
      titulo: payload.titulo,
      pia: payload.pia,
      carro: payload.carro,
      statusChamado: payload.statusChamado,
      documento: payload.documento,
      anexadoPorNome: payload.anexadoPorNome,
      anexadoPorEmail: payload.anexadoPorEmail,
      anexadoEm: payload.anexadoEm || new Date().toISOString(),
      observacoes: payload.observacoes,
      linkChamado: `https://sinistro.viasudeste.com/dashboard/chamados/${payload.chamadoId}`,
      destinatario: payload.destinatario || null,
    }

    const { error } = await supabase.functions.invoke('enviar-email-chamado', {
      body,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (error) throw error
  } catch (e) {
    console.warn('Falha no e-mail de anexo de Vale/Autorização:', e)
  }
}
