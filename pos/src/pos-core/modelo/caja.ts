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

/*
 * CONTRATO CONGELADO (D-012).
 *
 * Lo de aquí abajo es el contrato de caja de la suite, y está escrito con
 * los nombres de KM.WEB.RESTAURANT a propósito. El restaurante lo tenía
 * primero y en producción; este POS empezó el suyo por su cuenta y los dos
 * ya habían divergido en cuatro sitios —`montoInicial` contra
 * `fondoInicial`, un conteo de efectivo contra un conteo por medio, el
 * cierre ciego fijo contra parametrizable, y la diferencia calculada
 * contra guardada—.
 *
 * Divergir aquí no es un detalle de nombres: KARMA.LIB.CAJA sale de este
 * contrato, y dos verticales que llaman distinto a lo mismo son dos
 * librerías. Cuando hay dos nombres para lo mismo gana el que ya está
 * cobrando dinero de verdad.
 *
 * Lo que el POS NO adopta, y por qué:
 *
 *   `localId`      aquí es `sucursalId`, que es el nombre en todo el POS y
 *                  en el resto de la suite. El restaurante es el raro.
 *   `movimientos`  el restaurante deriva el arqueo de su tabla de ventas;
 *                  el POS no tiene tabla de ventas, así que lleva su propio
 *                  diario. Es la misma información por otro camino.
 *   `propinas`     no hay propina en un mostrador.
 */

/*
 * `devolucion` es su propio tipo y no un egreso cualquiera.
 *
 * Un egreso es plata que sale para una movilidad o una compra; una
 * devolución es una venta que se deshace. Mezclarlas haría que el resumen
 * del turno dijera que se vendieron mil y se gastaron doscientos, cuando
 * lo que pasó es que se vendieron ochocientos.
 */
export const tiposMovimiento = [
  'apertura',
  'venta',
  'devolucion',
  'ingreso',
  'egreso',
  'cierre',
] as const
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

/**
 * El arqueo de UN medio de pago al cerrar.
 *
 * Por medio y no solo el efectivo, que es como estaba. El cierre de
 * efectivo detecta el cajón descuadrado; lo que no detectaba era el total
 * de tarjeta que no cuadra con el voucher del POS bancario, ni el de Yape
 * contra el extracto. Y ese es justo el descuadre que nadie ve hasta fin
 * de mes, porque nadie lo está contando.
 */
export interface ConteoMedio {
  medio: string
  nombre: string
  /** Lo que el sistema dice que debería haber. */
  esperado: number
  /** Lo que la persona contó. */
  contado: number
  /** Contado menos esperado. Negativa falta, positiva sobra. */
  diferencia: number
}

export interface SesionCaja {
  id: string
  sucursalId: string
  usuarioId: string
  usuarioNombre: string
  abiertaEn: string
  cerradaEn?: string
  /** El sencillo con el que arranca el turno. */
  fondoInicial: number
  estado: 'abierta' | 'cerrada'
  movimientos: readonly MovimientoCaja[]
  /** Lo contado al cerrar, medio por medio. Solo existe tras el arqueo. */
  conteo?: readonly ConteoMedio[]
  /** La suma de las diferencias. Se GUARDA, no se recalcula. */
  diferencia?: number
  /** Lo que el cajero explicó del descuadre. */
  nota?: string
}

/**
 * Lo que debería haber en el cajón, en efectivo.
 *
 * Solo cuenta el efectivo: lo cobrado por Yape o tarjeta no está en la
 * gaveta, y meterlo en el esperado haría que todo arqueo saliera corto.
 */
export function efectivoEsperado(sesion: SesionCaja): number {
  const movido = sesion.movimientos
    .filter(
      (m) =>
        m.medio === 'EFE' || m.tipo === 'ingreso' || m.tipo === 'egreso' || m.tipo === 'devolucion',
    )
    .reduce((suma, m) => suma + m.importe, 0)
  return redondear(sesion.fondoInicial + movido)
}

/**
 * Lo que debería haber en cada medio al cerrar.
 *
 * El efectivo sale del cajón —fondo más lo cobrado en efectivo, más y menos
 * lo que entró y salió de la gaveta—; el resto es lo cobrado por ese medio
 * y nada más, porque no hay gaveta que llevar.
 *
 * El vuelto no aparece restado en ninguna parte y es correcto: el POS anota
 * en el diario lo que CUBRE el ticket, no lo que el cliente puso sobre el
 * mostrador, así que el billete de 50 por un ticket de 30 ya entró como 30.
 * El restaurante llega al mismo número por el otro camino, restando los
 * vueltos de lo cobrado.
 */
export function esperadoPorMedio(
  sesion: SesionCaja,
  medios: readonly MedioPago[],
): readonly { medio: string; nombre: string; esperado: number }[] {
  const cobrado = new Map(totalPorMedio(sesion).map((fila) => [fila.medio, fila.importe]))
  return medios.map((medio) => ({
    medio: medio.codigo,
    nombre: medio.nombre,
    esperado: medio.daVuelto ? efectivoEsperado(sesion) : (cobrado.get(medio.codigo) ?? 0),
  }))
}

/**
 * El arqueo: lo contado contra lo esperado, medio por medio.
 *
 * Función pura y no un método del adaptador porque es la regla que tiene
 * que dar el mismo número en el POS, en el restaurante y en la librería que
 * salga de los dos. Un medio que no se contó va como cero contado, que es
 * lo honesto: no contarlo no es que cuadre.
 */
export function arquear(
  sesion: SesionCaja,
  medios: readonly MedioPago[],
  contado: Readonly<Record<string, number>>,
): readonly ConteoMedio[] {
  return esperadoPorMedio(sesion, medios).map((fila) => {
    const cuenta = redondear(Math.max(0, contado[fila.medio] ?? 0))
    return {
      medio: fila.medio,
      nombre: fila.nombre,
      esperado: redondear(fila.esperado),
      contado: cuenta,
      diferencia: redondear(cuenta - fila.esperado),
    }
  })
}

/** La diferencia del turno entero: la suma de las de cada medio. */
export function diferenciaTotal(conteo: readonly ConteoMedio[]): number {
  return redondear(conteo.reduce((suma, fila) => suma + fila.diferencia, 0))
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

/**
 * Ventas del turno: cuántas y por cuánto, ya NETO de devoluciones.
 *
 * Neto porque es lo que se cobró de verdad. Enseñar lo bruto obliga al
 * cajero a restar de cabeza para saber cuánto entró, y ahí es donde se
 * equivoca.
 */
export function resumenVentas(sesion: SesionCaja): {
  cuantas: number
  importe: number
  devuelto: number
} {
  const ventas = sesion.movimientos.filter((m) => m.tipo === 'venta')
  const devoluciones = sesion.movimientos.filter((m) => m.tipo === 'devolucion')
  const tickets = new Set(ventas.map((m) => m.ticketId))
  const devuelto = redondear(devoluciones.reduce((suma, m) => suma + Math.abs(m.importe), 0))
  return {
    cuantas: tickets.size,
    importe: redondear(ventas.reduce((suma, m) => suma + m.importe, 0) - devuelto),
    devuelto,
  }
}

/**
 * Diferencia del arqueo de EFECTIVO: contado menos esperado.
 *
 * Negativa falta dinero, positiva sobra. Ninguna de las dos se corrige
 * sola: las dos se anotan, porque un sobrante repetido suele ser un cobro
 * mal registrado y no una suerte.
 */
export function diferenciaArqueo(sesion: SesionCaja, contado: number): number {
  return redondear(contado - efectivoEsperado(sesion))
}

/**
 * Si quien cuenta ve lo esperado mientras cuenta.
 *
 * Parametrizable, no fijo. Lo normal es que NO lo vea: si lo ve, escribe el
 * número que el sistema espera y el arqueo deja de medir nada. Pero hay
 * locales de un solo dueño donde el arqueo es una comprobación y no un
 * control, y ahí esconder el dato solo es incómodo.
 *
 * El valor por defecto es el ciego, que es el que protege al negocio del
 * que lo configura mal.
 */
export interface PoliticaCaja {
  cierreCiego: boolean
  /** Sin caja abierta no se cobra. Se puede apagar. */
  exigirCajaAbierta: boolean
}

export const politicaCajaPorDefecto: PoliticaCaja = {
  cierreCiego: true,
  exigirCajaAbierta: false,
}

/** Dos decimales exactos. En dinero, el residuo binario no es aceptable. */
function redondear(importe: number): number {
  return Math.round(importe * 100) / 100
}
