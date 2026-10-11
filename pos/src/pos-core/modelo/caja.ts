import type { ComprobanteRef } from './cuenta-por-cobrar'

/**
 * Caja: medios de pago, cobro y sesión de turno.
 *
 * Todo esto vive en el núcleo y no en un perfil porque no es de un rubro:
 * una botica, una tienda de ropa y una ferretería cobran igual. Lo que sí
 * cambia por país es la lista de medios, y por eso es dato y no un `enum`.
 *
 * El día que exista KARMA.LIB.CAJA, estas formas son el contrato que esa
 * librería tendrá que cumplir; el POS ya no registraría pagos por su cuenta,
 * pero seguiría hablando de `Pago` y `SesionCaja`.
 */

export interface MedioPago {
  codigo: string
  nombre: string
  /**
   * Si acepta más de lo que se debe y devuelve la diferencia.
   *
   * Solo el efectivo. Nadie yapea de más esperando vuelto, y una tarjeta
   * cobra el importe exacto: aceptar un exceso ahí sería cobrarlo de verdad.
   */
  daVuelto: boolean
  /** Pide un número de operación que acaba en el arqueo. */
  pideReferencia?: boolean
  icono?: string
}

export interface Pago {
  medio: MedioPago
  /** Lo que entra por este medio. En efectivo puede superar al total. */
  importe: number
  referencia?: string
}

/**
 * Reparto de un cobro entre varios medios.
 *
 * El pago mixto no es un caso raro: «te doy 20 en efectivo y el resto con
 * Yape» pasa a diario. Por eso el cobro es una lista y no un medio.
 */
export interface Cobro {
  total: number
  pagos: readonly Pago[]
  comprobante?: ComprobanteRef
}

/** Lo entregado por el cliente, sumando todos los medios. */
export function recibido(pagos: readonly Pago[]): number {
  return redondear(pagos.reduce((suma, pago) => suma + pago.importe, 0))
}

/**
 * Lo que aún falta por cubrir. Nunca negativo: un exceso no es deuda.
 *
 * Se calcula en céntimos porque sumar decimales en coma flotante deja
 * residuos de 0.00000001 que harían que un ticket pagado al céntimo
 * pareciera incompleto y bloqueara el cobro.
 */
export function pendiente(total: number, pagos: readonly Pago[]): number {
  return redondear(Math.max(0, total - recibido(pagos)))
}

/**
 * El vuelto.
 *
 * Solo lo entregado en medios que dan vuelto puede devolverse. Si alguien
 * carga 50 a la tarjeta de un ticket de 30, eso no es vuelto: es un cobro
 * mal hecho, y el panel lo impide antes de llegar aquí.
 */
export function vuelto(total: number, pagos: readonly Pago[]): number {
  const conVuelto = pagos.filter((pago) => pago.medio.daVuelto)
  const sinVuelto = recibido(pagos.filter((pago) => !pago.medio.daVuelto))
  const cubiertoPorEfectivo = Math.max(0, total - sinVuelto)
  return redondear(Math.max(0, recibido(conVuelto) - cubiertoPorEfectivo))
}

/** Un cobro está completo cuando no falta nada por cubrir. */
export function cobroCompleto(total: number, pagos: readonly Pago[]): boolean {
  return pagos.length > 0 && pendiente(total, pagos) === 0
}

/* ── Sesión de caja ─────────────────────────────────────────────────────── */

export const tiposMovimiento = ['apertura', 'venta', 'ingreso', 'egreso', 'cierre'] as const
export type TipoMovimiento = (typeof tiposMovimiento)[number]

export interface MovimientoCaja {
  id: string
  en: string
  tipo: TipoMovimiento
  concepto: string
  /** Código del medio de pago. La apertura y el cierre no llevan. */
  medio?: string
  /** Positivo entra, negativo sale. */
  importe: number
  ticketId?: string
}

export interface SesionCaja {
  id: string
  sucursalId: string
  usuarioId: string
  usuarioNombre: string
  abiertaEn: string
  cerradaEn?: string
  montoInicial: number
  estado: 'abierta' | 'cerrada'
  movimientos: readonly MovimientoCaja[]
  /** Lo que el cajero contó al cerrar. Solo existe tras el arqueo. */
  conteoFinal?: number
}

/**
 * Lo que debería haber en el cajón, en efectivo.
 *
 * Solo cuenta el efectivo: lo cobrado por Yape o tarjeta no está en la
 * gaveta, y meterlo en el esperado haría que todo arqueo saliera corto.
 */
export function efectivoEsperado(sesion: SesionCaja): number {
  const movido = sesion.movimientos
    .filter((m) => m.medio === 'EFE' || m.tipo === 'ingreso' || m.tipo === 'egreso')
    .reduce((suma, m) => suma + m.importe, 0)
  return redondear(sesion.montoInicial + movido)
}

/** Cuánto entró por cada medio. Es la mitad del arqueo que no es efectivo. */
export function totalPorMedio(sesion: SesionCaja): { medio: string; importe: number }[] {
  const cuenta = new Map<string, number>()
  for (const movimiento of sesion.movimientos) {
    if (!movimiento.medio) continue
    cuenta.set(movimiento.medio, (cuenta.get(movimiento.medio) ?? 0) + movimiento.importe)
  }
  return [...cuenta.entries()].map(([medio, importe]) => ({ medio, importe: redondear(importe) }))
}

/** Ventas del turno: cuántas y por cuánto. */
export function resumenVentas(sesion: SesionCaja): { cuantas: number; importe: number } {
  const ventas = sesion.movimientos.filter((m) => m.tipo === 'venta')
  const tickets = new Set(ventas.map((m) => m.ticketId))
  return {
    cuantas: tickets.size,
    importe: redondear(ventas.reduce((suma, m) => suma + m.importe, 0)),
  }
}

/**
 * Diferencia del arqueo: contado menos esperado.
 *
 * Negativa falta dinero, positiva sobra. Ninguna de las dos se corrige
 * sola: las dos se anotan, porque un sobrante repetido suele ser un cobro
 * mal registrado y no una suerte.
 */
export function diferenciaArqueo(sesion: SesionCaja, contado: number): number {
  return redondear(contado - efectivoEsperado(sesion))
}

/** Dos decimales exactos. En dinero, el residuo binario no es aceptable. */
function redondear(importe: number): number {
  return Math.round(importe * 100) / 100
}
