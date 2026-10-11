import type { UnidadMedida } from './unidades'

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

/**
 * Totales de un ticket.
 *
 * OJO con la semántica, porque no es la que trae un POS de manual. En el
 * comercio minorista peruano el precio de la etiqueta YA INCLUYE el IGV: lo
 * que el cliente ve en el estante es lo que paga. Así que el impuesto no se
 * suma al final, se EXTRAE del total.
 *
 * Por eso aquí no vale `subtotal + impuesto = total`, que es la fórmula del
 * modelo original y habría dado un cobro inflado en un 18 %. Lo que vale es:
 *
 *     bruto - descuento = total
 *     total = valorVenta + igv
 *
 * `valorVenta` e `igv` existen porque la boleta los exige desglosados, no
 * porque intervengan en el cobro.
 */
export interface Totales {
  /** Suma de las líneas a precio de etiqueta, antes de descuentos. */
  bruto: number
  /** Descuentos de línea más el descuento del ticket. */
  descuento: number
  /** Base imponible: lo que queda tras descuentos, sin IGV. */
  valorVenta: number
  /** IGV contenido en el total. Las líneas exoneradas no aportan. */
  igv: number
  /** Lo que paga el cliente. */
  total: number
}

export const totalesVacios: Totales = {
  bruto: 0,
  descuento: 0,
  valorVenta: 0,
  igv: 0,
  total: 0,
}

export interface LineaTicket<A = Record<string, unknown>> {
  /** UUID generado en el front. */
  id: string
  productoId: string
  descripcion: string
  /** Presentación elegida: tableta, blíster, caja. */
  unidad: UnidadMedida
  /**
   * Unidades de almacén que consume cada unidad vendida.
   *
   * Viaja en la línea, y no se consulta al descontar, porque el factor puede
   * cambiar en el catálogo después de la venta. Lo que se descontó tiene que
   * poder recalcularse con lo que se vendió, no con lo que diga el catálogo
   * mañana.
   */
  factorAlmacen: number
  cantidad: number
  /** Precio de una unidad de venta, CON el IGV incluido. */
  precioUnitario: number
  /** Tasa de IGV contenida en el precio. 0 si la presentación está exonerada. */
  igvTasa: number
  /** Importe descontado en esta línea, no un porcentaje. */
  descuento: number
  /** Talla y color, o lote y receta. El núcleo no lo abre. */
  atributos: A
}

/** Lo que el almacén tiene que descontar por una línea. */
export function consumoAlmacen(linea: LineaTicket): number {
  return linea.cantidad * linea.factorAlmacen
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
