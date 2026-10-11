/**
 * Clientes.
 *
 * El POS no es un CRM: aquí un cliente es lo mínimo para emitir el
 * comprobante y reconocer al que vuelve. Lo demás —historial, crédito,
 * segmentación— es del módulo de clientes del ERP, y cuando se contrata
 * este mismo `ClienteRef` se enlaza con el suyo.
 */

export const tiposDocumento = ['DNI', 'RUC', 'CE', 'PAS'] as const
export type TipoDocumento = (typeof tiposDocumento)[number]

export interface Cliente {
  id: string
  tipoDocumento: TipoDocumento
  /** Sin él solo se puede emitir nota de venta. */
  documento: string
  nombre: string
  direccion?: string
  telefono?: string
  /** Última compra en ISO. Es lo que distingue a un habitual de uno suelto. */
  ultimaCompra?: string
  /** Cuántas veces ha comprado, para el mismo fin. */
  compras?: number
}

/**
 * Valida el documento según su tipo.
 *
 * Importa de verdad: un RUC mal escrito en una factura la invalida ante
 * SUNAT y se descubre al día siguiente, cuando ya no hay cliente a quien
 * preguntar. Se comprueba la longitud, que es lo que se puede verificar sin
 * consultar a nadie.
 */
export function documentoValido(tipo: TipoDocumento, documento: string): boolean {
  const limpio = documento.trim()
  if (tipo === 'DNI') return /^\d{8}$/.test(limpio)
  if (tipo === 'RUC') return /^(10|15|17|20)\d{9}$/.test(limpio)
  // Carné de extranjería y pasaporte no tienen longitud fija en Perú.
  return limpio.length >= 6 && limpio.length <= 15
}

/** Los comprobantes que admite un cliente según su documento. */
export function comprobantesPara(cliente: Cliente | null): readonly string[] {
  if (!cliente) return ['BOL', 'NDV']
  return cliente.tipoDocumento === 'RUC' ? ['FAC', 'BOL', 'NDV'] : ['BOL', 'NDV']
}
