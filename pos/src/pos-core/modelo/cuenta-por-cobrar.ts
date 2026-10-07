/**
 * Lo que el POS entrega para que otro lo cobre.
 *
 * `CuentaPorCobrar` es genérica a propósito: es la misma forma que usará la
 * recepción del hotel cuando cobre con la misma librería de caja. Por eso no
 * menciona el ticket, sino un `origen` y una `referenciaId`.
 */

export interface MedioPagoRef {
  codigo: string
  nombre: string
}

export interface ComprobanteRef {
  tipo: string
  serie: string
  numero: string
}

export interface CuentaPorCobrar {
  /** 'pos', 'hotel', ... */
  origen: string
  /** Id del ticket o de la cuenta de habitación. */
  referenciaId: string
  concepto: string
  total: number
  mediosDePagoExtra?: MedioPagoRef[]
}

export interface ResultadoCobro {
  estado: 'cobrado' | 'cancelado'
  pagoId?: string
  comprobante?: ComprobanteRef
}
