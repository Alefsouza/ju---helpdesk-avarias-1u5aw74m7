import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isDuplicateTicket(ticket: any, allActiveTickets: any[]) {
  if (!ticket || !ticket.carro) return false

  const ticketCarroNum = ticket.carro.replace(/\D/g, '')
  if (!ticketCarroNum) return false

  const getTicketDate = (t: any) => {
    if (t.data_ocorrencia) return t.data_ocorrencia.split('T')[0]
    if (t.criado_em) return new Date(t.criado_em).toISOString().split('T')[0]
    return null
  }

  const ticketDate = getTicketDate(ticket)
  if (!ticketDate) return false

  return allActiveTickets.some((other) => {
    // Cannot be duplicate of itself
    if (other.id === ticket.id) return false

    // Only check against open or in-progress tickets
    if (other.status !== 'aberto' && other.status !== 'em_atendimento') return false

    if (!other.carro) return false
    const otherCarroNum = other.carro.replace(/\D/g, '')
    if (!otherCarroNum) return false

    const otherDate = getTicketDate(other)
    if (!otherDate) return false

    return ticketCarroNum === otherCarroNum && ticketDate === otherDate
  })
}
