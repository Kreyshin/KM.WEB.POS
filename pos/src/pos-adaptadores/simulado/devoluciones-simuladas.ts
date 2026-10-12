import {
  importeDevuelto,
  politicaDevolucionPorDefecto,
  type ComprobanteRef,
  type Devolucion,
  type NotaConSaldo,
  type PoliticaDevolucion,
  type PuertoDevoluciones,
  type Ticket,
  type VentaCobrada,
} from '@pos-core/index'
import { siguienteComprobante } from './caja-simulada'

/**
 * Devoluciones en memoria, con respaldo en el navegador.
 *
 * Guarda tres cosas que el POS no guardaba: las VENTAS COBRADAS —sin ellas
 * no hay nada que devolver—, las devoluciones hechas, y las notas con
 * saldo a favor del cliente.
 *
 * En producción esto es `KARMA.MS.POS`: el correlativo de la nota lo pone
 * quien lo custodia, no esta pantalla.
 */

const LLAVE_VENTAS = 'km.pos.ventas'
const LLAVE_DEVOLUCIONES = 'km.pos.devoluciones'
const LLAVE_NOTAS = 'km.pos.notas'

function leer<T>(llave: string): T[] {
  try {
    const crudo = localStorage.getItem(llave)
    return crudo ? (JSON.parse(crudo) as T[]) : []
  } catch {
    return []
  }
}

function escribir<T>(llave: string, datos: T[]): void {
  try {
    localStorage.setItem(llave, JSON.stringify(datos))
  } catch {
    // Sin respaldo se sigue operando; lo que no puede es reventar aquí.
  }
}

function identificador(prefijo: string): string {
  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Arma la venta cobrada a partir del ticket y su comprobante. */
export function ventaDeTicket(ticket: Ticket, comprobante: ComprobanteRef): VentaCobrada {
  return {
    ticketId: ticket.id,
    comprobante,
    emitidoEn: new Date().toISOString(),
    cliente: ticket.cliente?.nombre,
    total: ticket.totales.total,
    lineas: ticket.lineas,
  }
}

export class DevolucionesSimuladas implements PuertoDevoluciones {
  async politica(_sucursalId: string): Promise<PoliticaDevolucion> {
    // Fija aquí porque no hay parámetros que leer. En producción la trae el
    // microservicio; lo que importa es que la pantalla PREGUNTE en vez de
    // dar por hecho el proceso de una empresa concreta.
    return politicaDevolucionPorDefecto
  }

  /**
   * Guarda la venta cobrada.
   *
   * Hasta hoy el POS la olvidaba en cuanto se cobraba: se imprimía el
   * recibo y no quedaba nada, así que una devolución media hora después no
   * tenía contra qué hacerse.
   */
  async anotarVenta(venta: VentaCobrada): Promise<void> {
    const ventas = leer<VentaCobrada>(LLAVE_VENTAS)
    escribir(LLAVE_VENTAS, [venta, ...ventas.filter((v) => v.ticketId !== venta.ticketId)])
  }

  async ventasDevolubles(_sucursalId: string, texto = ''): Promise<readonly VentaCobrada[]> {
    const buscado = texto.trim().toLowerCase()
    const ventas = leer<VentaCobrada>(LLAVE_VENTAS)
    if (!buscado) return ventas.slice(0, 50)
    return ventas.filter(
      (venta) =>
        `${venta.comprobante.serie}-${venta.comprobante.numero}`.toLowerCase().includes(buscado) ||
        (venta.cliente ?? '').toLowerCase().includes(buscado) ||
        venta.lineas.some((linea) => linea.descripcion.toLowerCase().includes(buscado)),
    )
  }

  async previas(ticketId: string): Promise<readonly Devolucion[]> {
    return leer<Devolucion>(LLAVE_DEVOLUCIONES).filter((d) => d.ticketId === ticketId)
  }

  async registrar(entrada: Omit<Devolucion, 'id' | 'nota'>): Promise<Devolucion> {
    const devolucion: Devolucion = {
      ...entrada,
      id: identificador('dev'),
      // La baja no emite documento: informa que el comprobante no existió.
      nota: entrada.camino === 'nota' ? siguienteComprobante('NCR') : undefined,
    }

    escribir(LLAVE_DEVOLUCIONES, [...leer<Devolucion>(LLAVE_DEVOLUCIONES), devolucion])

    // Si el dinero no se devolvió, la nota queda viva como saldo a favor.
    if (devolucion.comoSeDevolvio === 'saldo' && devolucion.nota) {
      const notas = leer<NotaConSaldo>(LLAVE_NOTAS)
      notas.push({
        comprobante: devolucion.nota,
        emitidaEn: devolucion.en,
        importe: devolucion.importe,
        consumido: 0,
      })
      escribir(LLAVE_NOTAS, notas)
    }

    return devolucion
  }

  async notasConSaldo(_sucursalId: string): Promise<readonly NotaConSaldo[]> {
    return leer<NotaConSaldo>(LLAVE_NOTAS).filter((nota) => nota.importe > nota.consumido)
  }
}

/** Recalcula el importe de una devolución desde las líneas de la venta. */
export { importeDevuelto }
