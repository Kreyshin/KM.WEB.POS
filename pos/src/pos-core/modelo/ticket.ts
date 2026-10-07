/**
 * El ticket es igual para todos los rubros.
 *
 * Lo propio de cada rubro viaja en `atributos`, que el núcleo guarda y nunca
 * interpreta: solo lo leen el perfil que lo escribió y el microservicio del
 * vertical. Esa es la razón de que este archivo no tenga ninguna condición por
 * rubro, y de que no deba tenerla nunca.
 */

/** Estados por los que pasa un ticket. */
export const estadosTicket = ['borrador', 'por_cobrar', 'cobrado', 'anulado'] as const

export type EstadoTicket = (typeof estadosTicket)[number]

export interface ClienteRef {
  id: string
  nombre: string
  documento?: string
}

export interface Totales {
  subtotal: number
  descuento: number
  impuesto: number
  total: number
}

export interface LineaTicket<A = Record<string, unknown>> {
  /** UUID generado en el front. */
  id: string
  productoId: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  /** Talla y color, o lote y receta. El núcleo no lo abre. */
  atributos: A
}

export interface Ticket {
  /** UUID generado en el front, para que reintentar un envío no duplique la venta. */
  id: string
  sucursalId: string
  /** Código del perfil de rubro: 'ropa', 'farmacia', ... */
  perfil: string
  cliente?: ClienteRef
  lineas: LineaTicket[]
  totales: Totales
  estado: EstadoTicket
}

/**
 * Transiciones permitidas. Se avanza de borrador a por cobrar y de ahí a
 * cobrado; se puede anular desde los dos primeros, y de 'cobrado' no se sale
 * (una venta cobrada se corrige con una nota, no cambiando su estado).
 */
export const transicionesTicket: Record<EstadoTicket, readonly EstadoTicket[]> = {
  borrador: ['por_cobrar', 'anulado'],
  por_cobrar: ['cobrado', 'anulado'],
  cobrado: [],
  anulado: [],
}

export function puedeTransicionar(desde: EstadoTicket, hacia: EstadoTicket): boolean {
  return transicionesTicket[desde].includes(hacia)
}
