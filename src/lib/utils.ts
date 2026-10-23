import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gera um UUID v4 seguro com fallback quando crypto.randomUUID não existir
 * (por exemplo, em navegadores legados ou contexto HTTP não-seguro).
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID()
      } catch {
        // Fallback se falhar
      }
    }
    if (typeof crypto.getRandomValues === 'function') {
      try {
        const bytes = new Uint8Array(16)
        crypto.getRandomValues(bytes)
        bytes[6] = (bytes[6] & 0x0f) | 0x40 // versão 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC4122
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
      } catch {
        // Fallback se getRandomValues falhar
      }
    }
  }

  // Fallback baseado em Math.random RFC4122 compliant
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function isDuplicateTicket(ticket: any, activeTickets: any[]) {
  if (!ticket || !activeTickets || !Array.isArray(activeTickets)) return false

  const ticketDate = ticket.data_ocorrencia
  const ticketCar = ticket.carro

  if (!ticketDate || !ticketCar) return false

  return activeTickets.some((other) => {
    if (other.id === ticket.id) return false

    if (!other.data_ocorrencia || other.data_ocorrencia !== ticketDate) return false

    const otherCar = other.carro
    const otherTitle = other.titulo || ''
    const ticketTitle = ticket.titulo || ''

    const isExactCarMatch = !!(otherCar && otherCar === ticketCar)
    const isTicketCarInOtherTitle = !!(ticketCar && otherTitle.includes(ticketCar))
    const isOtherCarInTicketTitle = !!(otherCar && ticketTitle.includes(otherCar))

    return isExactCarMatch || isTicketCarInOtherTitle || isOtherCarInTicketTitle
  })
}
