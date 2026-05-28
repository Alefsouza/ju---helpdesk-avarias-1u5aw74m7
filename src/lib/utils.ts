/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractCarro(c: { carro?: string | null; titulo?: string | null }) {
  if (c.carro && c.carro.trim() !== '') return c.carro.trim().toUpperCase()
  const matchCarro = c.titulo?.match(/carro\s+([a-zA-Z0-9_-]+)/i)
  if (matchCarro) return matchCarro[1].toUpperCase()
  const matchDigits = c.titulo?.match(/\b(\d{3,6})\b/)
  return matchDigits ? matchDigits[1] : null
}

export function isDuplicateTicket(ticket: any, allActiveTickets: any[]) {
  const carro = extractCarro(ticket)
  if (!carro) return false

  const tCriado = ticket.criado_em?.substring(0, 10)
  const tOcorrencia = ticket.data_ocorrencia?.substring(0, 10)

  return allActiveTickets.some((other) => {
    if (other.id === ticket.id) return false

    const otherCarro = extractCarro(other)
    if (carro !== otherCarro) return false

    const oCriado = other.criado_em?.substring(0, 10)
    const oOcorrencia = other.data_ocorrencia?.substring(0, 10)

    const match1 = Boolean(tCriado && oCriado && tCriado === oCriado)
    const match2 = Boolean(tCriado && oOcorrencia && tCriado === oOcorrencia)
    const match3 = Boolean(tOcorrencia && oCriado && tOcorrencia === oCriado)
    const match4 = Boolean(tOcorrencia && oOcorrencia && tOcorrencia === oOcorrencia)

    return match1 || match2 || match3 || match4
  })
}
