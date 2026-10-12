/**
 * Devoluciones, anulación y notas.
 *
 * Es del POS y no del ERP: ocurre con el cliente delante, en el mostrador,
 * y la plata sale de la misma gaveta que se arquea al cerrar el turno.
 *
 * LAS DOS FORMAS DE DESHACER UNA VENTA, porque las dos existen:
 *
 *   BAJA   el comprobante se informa como no emitido. La venta no existió.
 *          Solo dentro del plazo que concede la norma.
 *   NOTA   se emite una nota de crédito que corrige la venta, que sigue
 *          existiendo. Es lo que queda fuera de ese plazo.
 *
 * Cuál se usa NO lo decide este código: lo decide la empresa, porque cada
 * una tiene su proceso y las dos son legales. Aquí solo se calcula cuál
 * CABE —por plazo y por tipo de comprobante— y la política dice cuál se
 * prefiere.
 *
 * Nada de lo que la norma puede cambiar está escrito como constante. Los
 * plazos son parámetros con valor por defecto, y el valor por defecto es el
 * que hoy se usa en Perú.
 */
import type { ComprobanteRef } from './cuenta-por-cobrar'
import type { LineaTicket } from './ticket'
import { aCentimos, totalLinea } from './totales'

/* ── Comprobantes ────────────────────────────────────────────────────────── */

/**
 * Los documentos que el POS emite.
 *
 * `NDV` es la nota de venta: papel interno, sin valor tributario, para
 * quien todavía no factura electrónicamente o para una venta que no lo
 * necesita. No gasta correlativo de boleta.
 */
export const tiposComprobante = ['BOL', 'FAC', 'NCR', 'NDB', 'NDV'] as const
export type TipoComprobante = (typeof tiposComprobante)[number]

/** Si el documento corrige a otro en vez de ser una venta por sí mismo. */
export function esNota(tipo: string): boolean {
  return tipo === 'NCR' || tipo === 'NDB'
}

/** Si el documento va a SUNAT. La nota de venta no. */
export function esElectronico(tipo: string): boolean {
  return tipo !== 'NDV'
}

/**
 * Motivos de una nota, con el código del catálogo de SUNAT.
 *
 * Van como DATO y no como `enum` de código porque el catálogo lo publica
 * la administración y crece sin avisar. Lo que importa aquí es que el
 * motivo exista, no cuál sea.
 */
export interface MotivoNota {
  codigo: string
  etiqueta: string
  /** Si obliga a decir qué líneas vuelven. Un error de datos no devuelve nada. */
  conLineas: boolean
}

export const motivosNotaCredito: readonly MotivoNota[] = [
  { codigo: '01', etiqueta: 'Anulación de la operación', conLineas: false },
  { codigo: '06', etiqueta: 'Devolución total', conLineas: true },
  { codigo: '07', etiqueta: 'Devolución parcial', conLineas: true },
  { codigo: '04', etiqueta: 'Descuento global', conLineas: false },
  { codigo: '09', etiqueta: 'Disminución en el valor', conLineas: true },
  { codigo: '02', etiqueta: 'Error en los datos del cliente', conLineas: false },
]

/* ── Política de la empresa ──────────────────────────────────────────────── */

/**
 * Cómo deshace las ventas ESTA empresa.
 *
 * Todo parametrizable porque todo cambia de una tienda a otra, y porque
 * los plazos los mueve la administración tributaria sin pedir permiso.
 */
export interface PoliticaDevolucion {
  /** Días desde la emisión en los que todavía cabe dar de baja. */
  diasParaBaja: number
  /**
   * Si se prefiere la nota de crédito aunque la baja quepa.
   *
   * Hay empresas que nunca dan de baja: quieren que todo movimiento deje
   * rastro en los libros, y una venta que desaparece no lo deja.
   */
  siempreNota: boolean
  /** Si se devuelve efectivo. Donde no, la nota queda como saldo a favor. */
  devuelveEfectivo: boolean
  /** Si una nota de crédito se puede usar para pagar una compra futura. */
  notaComoPago: boolean
  /**
   * Si la nota admite consumos parciales.
   *
   * Encendido, una nota de 50 contra una compra de 30 deja 20 a favor.
   * Apagado, se consume entera y lo que sobra se pierde, que es la
   * política de quien no quiere llevar saldos abiertos.
   */
  saldoParcial: boolean
  /** Si hace falta escribir por qué. Casi siempre sí. */
  exigeMotivo: boolean
}

export const politicaDevolucionPorDefecto: PoliticaDevolucion = {
  diasParaBaja: 7,
  siempreNota: false,
  devuelveEfectivo: true,
  notaComoPago: true,
  saldoParcial: true,
  exigeMotivo: true,
}

export type CaminoAnulacion = 'baja' | 'nota'

/**
 * Qué camino toca para deshacer esta venta.
 *
 * Una devolución PARCIAL nunca es baja: la venta sigue existiendo por lo
 * que el cliente se quedó. Dar de baja el comprobante entero y volver a
 * emitir otro por la diferencia es un apaño que deja dos documentos donde
 * la norma espera uno.
 *
 * Y un comprobante YA CORREGIDO tampoco se da de baja. Si ya se le emitió
 * una nota, ese documento tiene historia: decir después que nunca existió
 * deja la nota apuntando a un comprobante que no está, y eso no hay forma
 * de explicarlo en una fiscalización.
 */
export function caminoDeAnulacion(
  comprobante: { tipo: string; emitidoEn: string },
  politica: PoliticaDevolucion,
  parcial: boolean,
  ahora = new Date(),
  yaCorregido = false,
): CaminoAnulacion {
  if (parcial || yaCorregido) return 'nota'
  if (politica.siempreNota) return 'nota'
  // La nota de venta no va a SUNAT, así que no hay nada que dar de baja
  // ni plazo que respetar: se anula y ya está.
  if (!esElectronico(comprobante.tipo)) return 'baja'
  return diasDesde(comprobante.emitidoEn, ahora) <= politica.diasParaBaja ? 'baja' : 'nota'
}

export function diasDesde(fechaIso: string, ahora = new Date()): number {
  const emitido = new Date(fechaIso)
  const dia = 24 * 60 * 60 * 1000
  return Math.floor((ahora.getTime() - emitido.getTime()) / dia)
}

/* ── La devolución ───────────────────────────────────────────────────────── */

/** Cuánto vuelve de una línea, y qué ejemplar en concreto. */
export interface LineaDevuelta {
  lineaId: string
  cantidad: number
  /**
   * La serie o el lote que vuelve a la tienda.
   *
   * Importa porque lo que vuelve no es «un televisor», es ESE televisor:
   * sin el número, el stock se repone con un aparato que nadie puede
   * identificar y la próxima garantía no se puede atender.
   */
  ejemplar?: string
}

export interface Devolucion {
  id: string
  ticketId: string
  /** El comprobante de la venta que se corrige. */
  comprobanteOrigen: ComprobanteRef
  en: string
  lineas: readonly LineaDevuelta[]
  motivo: MotivoNota
  /** Qué se escribió a mano. Un motivo de catálogo no explica el caso. */
  detalle?: string
  camino: CaminoAnulacion
  /** Quién lo autorizó. Una devolución sin responsable no se puede explicar. */
  autorizadoPor: string
  importe: number
  /** Si el dinero salió de la gaveta o quedó como saldo a favor. */
  comoSeDevolvio: 'efectivo' | 'saldo'
  /** La nota emitida, cuando el camino fue nota. */
  nota?: ComprobanteRef
}

/**
 * Lo que todavía se puede devolver de cada línea.
 *
 * Descuenta lo ya devuelto antes: sin esto, devolver tres veces la misma
 * unidad es trivial, y es la forma más fácil de vaciar una caja desde el
 * mostrador.
 */
export function devolubles(
  lineas: readonly LineaTicket[],
  previas: readonly Devolucion[] = [],
): readonly { linea: LineaTicket; disponible: number }[] {
  const yaDevuelto = new Map<string, number>()
  for (const devolucion of previas) {
    for (const vuelta of devolucion.lineas) {
      yaDevuelto.set(vuelta.lineaId, (yaDevuelto.get(vuelta.lineaId) ?? 0) + vuelta.cantidad)
    }
  }
  return lineas.map((linea) => ({
    linea,
    disponible: Math.max(0, linea.cantidad - (yaDevuelto.get(linea.id) ?? 0)),
  }))
}

/**
 * Lo que hay que devolver por lo que vuelve.
 *
 * A prorrata del descuento que llevaba la línea, no al precio de etiqueta.
 * Si se vendieron diez a mitad de precio y vuelven tres, se devuelve lo
 * que el cliente pagó por esas tres, no lo que costaban sin rebaja.
 */
export function importeDevuelto(
  lineas: readonly LineaTicket[],
  vueltas: readonly LineaDevuelta[],
): number {
  const porId = new Map(lineas.map((linea) => [linea.id, linea]))
  let total = 0
  for (const vuelta of vueltas) {
    const linea = porId.get(vuelta.lineaId)
    if (!linea || linea.cantidad <= 0) continue
    const cantidad = Math.min(Math.max(0, vuelta.cantidad), linea.cantidad)
    total += (totalLinea(linea) * cantidad) / linea.cantidad
  }
  return aCentimos(total)
}

/** Si vuelve todo lo que se vendió. Decide si cabe la baja. */
export function esDevolucionTotal(
  lineas: readonly LineaTicket[],
  vueltas: readonly LineaDevuelta[],
  previas: readonly Devolucion[] = [],
): boolean {
  const disponibles = devolubles(lineas, previas)
  if (disponibles.every((fila) => fila.disponible === 0)) return false
  return disponibles.every((fila) => {
    const vuelve = vueltas
      .filter((v) => v.lineaId === fila.linea.id)
      .reduce((suma, v) => suma + v.cantidad, 0)
    return vuelve >= fila.disponible
  })
}

/**
 * Lo que impide registrar la devolución, en una frase.
 *
 * El orden es el del formulario: primero lo que se eligió, luego por qué,
 * luego quién lo autoriza.
 */
export function problemaDeDevolucion(
  lineas: readonly LineaTicket[],
  vueltas: readonly LineaDevuelta[],
  motivo: MotivoNota | null,
  autorizadoPor: string,
  politica: PoliticaDevolucion,
  previas: readonly Devolucion[] = [],
): string | null {
  const conCantidad = vueltas.filter((vuelta) => vuelta.cantidad > 0)
  if (motivo?.conLineas !== false && conCantidad.length === 0) {
    return 'Elige qué vuelve y cuánto.'
  }

  const disponibles = new Map(devolubles(lineas, previas).map((f) => [f.linea.id, f.disponible]))
  for (const vuelta of conCantidad) {
    const disponible = disponibles.get(vuelta.lineaId)
    if (disponible === undefined) return 'Hay una línea que no es de esta venta.'
    if (vuelta.cantidad > disponible) {
      return `No se puede devolver más de lo que queda: de esa línea quedan ${disponible}.`
    }
  }

  if (politica.exigeMotivo && !motivo) return 'Falta el motivo.'
  if (!autorizadoPor.trim()) return 'Falta quién autoriza la devolución.'
  return null
}

/* ── La nota como medio de pago ──────────────────────────────────────────── */

/**
 * Una nota de crédito con saldo a favor del cliente.
 *
 * Existe porque hay empresas que no devuelven efectivo: entregan una nota
 * que el cliente usa en su próxima compra. Es práctica corriente en Perú y
 * en media Latinoamérica.
 */
export interface NotaConSaldo {
  comprobante: ComprobanteRef
  clienteId?: string
  emitidaEn: string
  importe: number
  /** Lo ya gastado en compras posteriores. */
  consumido: number
}

export function saldoDeNota(nota: NotaConSaldo): number {
  return aCentimos(Math.max(0, nota.importe - nota.consumido))
}

/**
 * Cuánto se puede aplicar de una nota a una compra.
 *
 * Con `saldoParcial` apagado la nota se consume ENTERA o no se usa: no se
 * puede dejar media nota viva, así que si el saldo pasa del total se
 * aplica igual y lo que sobra se pierde. Es duro, y es la política de
 * quien no quiere llevar saldos abiertos; por eso se avisa en pantalla y
 * no se aplica sin confirmar.
 */
export function aplicableDeNota(
  nota: NotaConSaldo,
  totalACobrar: number,
  politica: PoliticaDevolucion,
): number {
  const saldo = saldoDeNota(nota)
  if (saldo <= 0) return 0
  if (!politica.saldoParcial) return saldo
  return aCentimos(Math.min(saldo, totalACobrar))
}

/** Lo que se pierde al aplicar la nota, si la política no guarda saldo. */
export function saldoQueSePierde(
  nota: NotaConSaldo,
  totalACobrar: number,
  politica: PoliticaDevolucion,
): number {
  if (politica.saldoParcial) return 0
  return aCentimos(Math.max(0, saldoDeNota(nota) - totalACobrar))
}
