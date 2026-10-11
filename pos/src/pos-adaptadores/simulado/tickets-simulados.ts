import type { PuertoTickets, Ticket } from '@pos-core/index'

/**
 * Tickets en espera, en memoria y con respaldo en el navegador.
 *
 * «Por cobrar» es la única pantalla del POS que es una lista: existe porque
 * en una botica con dos personas, una arma el pedido en el mostrador y otra
 * cobra en caja. También resuelve el caso del cliente que se olvidó la
 * billetera en el carro: se aparca el ticket y sigue la cola.
 */

const LLAVE = 'km.pos.tickets'

function leer(): Ticket[] {
  try {
    const crudo = localStorage.getItem(LLAVE)
    return crudo ? (JSON.parse(crudo) as Ticket[]) : []
  } catch {
    return []
  }
}

function escribir(tickets: Ticket[]): void {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(tickets))
  } catch {
    // Sin respaldo se sigue vendiendo; lo que no puede es reventar aquí.
  }
}

export class TicketsSimulados implements PuertoTickets {
  async guardar(ticket: Ticket): Promise<void> {
    const tickets = leer()
    const indice = tickets.findIndex((guardado) => guardado.id === ticket.id)
    if (indice === -1) tickets.push(ticket)
    else tickets[indice] = ticket
    escribir(tickets)
  }

  async enviarACobro(ticketId: string): Promise<void> {
    const tickets = leer()
    const indice = tickets.findIndex((ticket) => ticket.id === ticketId)
    if (indice === -1) return
    tickets[indice] = { ...tickets[indice], estado: 'por_cobrar' }
    escribir(tickets)
  }

  async porCobrar(sucursalId: string): Promise<Ticket[]> {
    return leer()
      .filter((ticket) => ticket.estado === 'por_cobrar' && ticket.sucursalId === sucursalId)
      .sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? ''))
  }

  /** Lo retira de la lista: ya se cobró o se anuló. */
  async quitar(ticketId: string): Promise<void> {
    escribir(leer().filter((ticket) => ticket.id !== ticketId))
  }
}
