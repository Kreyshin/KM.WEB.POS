import { diferenciaTotal, politicaCajaPorDefecto } from '@pos-core/index'
import type {
  Cobro,
  ConteoMedio,
  ComprobanteRef,
  MedioPago,
  MovimientoCaja,
  PoliticaCaja,
  PuertoCaja,
  PuertoMediosPago,
  PuertoPagos,
  ResultadoCobro,
  SesionCaja,
} from '@pos-core/index'

/**
 * Caja en memoria, con respaldo en el navegador.
 *
 * Guarda en `localStorage` y no solo en memoria porque una caja que se
 * borra al recargar la página no se puede enseñar: el arqueo del final del
 * turno necesita los movimientos de toda la mañana. Es un sustituto de
 * KARMA.LIB.CAJA, no su diseño definitivo.
 */

const LLAVE = 'km.pos.caja'

/** Los de Perú. La lista es dato porque cambia por país y por negocio. */
const medios: readonly MedioPago[] = [
  { codigo: 'EFE', nombre: 'Efectivo', daVuelto: true, icono: 'efectivo' },
  { codigo: 'YAP', nombre: 'Yape', daVuelto: false, pideReferencia: true, icono: 'movil' },
  { codigo: 'PLN', nombre: 'Plin', daVuelto: false, pideReferencia: true, icono: 'movil' },
  { codigo: 'VIS', nombre: 'Débito', daVuelto: false, pideReferencia: true, icono: 'tarjeta' },
  { codigo: 'MST', nombre: 'Crédito', daVuelto: false, pideReferencia: true, icono: 'tarjeta' },
  { codigo: 'TRF', nombre: 'Transferencia', daVuelto: false, pideReferencia: true, icono: 'banco' },
]

export class MediosPagoSimulados implements PuertoMediosPago {
  async disponibles(): Promise<readonly MedioPago[]> {
    return medios
  }
}

function leer(): SesionCaja[] {
  try {
    const crudo = localStorage.getItem(LLAVE)
    return crudo ? (JSON.parse(crudo) as SesionCaja[]) : []
  } catch {
    // Un almacenamiento corrupto o bloqueado no puede impedir vender: se
    // empieza de cero y el turno sigue.
    return []
  }
}

function escribir(sesiones: SesionCaja[]): void {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(sesiones))
  } catch {
    // Modo privado o cuota llena. Se pierde el respaldo, no la venta.
  }
}

function identificador(prefijo: string): string {
  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export class CajaSimulada implements PuertoCaja {
  async actual(sucursalId: string, usuarioId: string): Promise<SesionCaja | null> {
    return (
      leer().find(
        (sesion) =>
          sesion.estado === 'abierta' &&
          sesion.sucursalId === sucursalId &&
          sesion.usuarioId === usuarioId,
      ) ?? null
    )
  }

  async abrir(
    sucursalId: string,
    usuario: { id: string; nombre: string },
    fondoInicial: number,
  ): Promise<SesionCaja> {
    const abierta = await this.actual(sucursalId, usuario.id)
    if (abierta) return abierta

    const ahora = new Date().toISOString()
    const sesion: SesionCaja = {
      id: identificador('caja'),
      sucursalId,
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
      abiertaEn: ahora,
      fondoInicial,
      estado: 'abierta',
      movimientos: [
        {
          id: identificador('mov'),
          en: ahora,
          tipo: 'apertura',
          concepto: 'Fondo de apertura',
          importe: 0,
        },
      ],
    }

    const sesiones = leer()
    sesiones.push(sesion)
    escribir(sesiones)
    return sesion
  }

  async registrar(
    sesionId: string,
    movimiento: Omit<MovimientoCaja, 'id' | 'en'>,
  ): Promise<SesionCaja> {
    const sesiones = leer()
    const indice = sesiones.findIndex((sesion) => sesion.id === sesionId)
    if (indice === -1) throw new Error('La sesión de caja no existe.')
    if (sesiones[indice].estado === 'cerrada') {
      throw new Error('La caja está cerrada: no admite movimientos.')
    }

    const completo: MovimientoCaja = {
      ...movimiento,
      id: identificador('mov'),
      en: new Date().toISOString(),
    }
    sesiones[indice] = {
      ...sesiones[indice],
      movimientos: [...sesiones[indice].movimientos, completo],
    }
    escribir(sesiones)
    return sesiones[indice]
  }

  /**
   * La política de caja de la sucursal.
   *
   * Aquí es fija porque no hay parámetros que leer; en producción la trae
   * el microservicio del vertical. Lo que importa es que la pantalla
   * PREGUNTE en vez de dar por hecho el cierre ciego, que es lo que hacía.
   */
  async politica(_sucursalId: string): Promise<PoliticaCaja> {
    return politicaCajaPorDefecto
  }

  async cerrar(
    sesionId: string,
    conteo: readonly ConteoMedio[],
    nota?: string,
  ): Promise<SesionCaja> {
    const sesiones = leer()
    const indice = sesiones.findIndex((sesion) => sesion.id === sesionId)
    if (indice === -1) throw new Error('La sesión de caja no existe.')
    if (sesiones[indice].estado === 'cerrada') throw new Error('Esa caja ya está cerrada.')

    const ahora = new Date().toISOString()
    sesiones[indice] = {
      ...sesiones[indice],
      estado: 'cerrada',
      cerradaEn: ahora,
      conteo,
      // Se guarda, no se recalcula: el número firmado tiene que ser el que
      // el cajero vio, aunque mañana cambie la forma de calcularlo.
      diferencia: diferenciaTotal(conteo),
      nota: nota?.trim() || undefined,
      movimientos: [
        ...sesiones[indice].movimientos,
        {
          id: identificador('mov'),
          en: ahora,
          tipo: 'cierre',
          concepto:
            diferenciaTotal(conteo) === 0
              ? 'Cierre de caja, cuadrado'
              : `Cierre de caja, diferencia ${diferenciaTotal(conteo).toFixed(2)}`,
          importe: 0,
        },
      ],
    }
    escribir(sesiones)
    return sesiones[indice]
  }
}

/**
 * Numeración de comprobantes.
 *
 * Correlativa por serie y guardada igual que la caja. En producción la da
 * SUNAT a través del microservicio, y el POS no la inventa nunca; aquí
 * existe para que la boleta impresa de la demo tenga un número creíble.
 */
const LLAVE_SERIE = 'km.pos.correlativo'

function siguienteComprobante(tipo: string): ComprobanteRef {
  // Una nota de venta no es comprobante electrónico: lleva su propia serie
  // interna y no va a SUNAT. Separarla evita que gaste correlativo de boleta.
  const serie = tipo === 'FAC' ? 'F001' : tipo === 'NDV' ? 'NV01' : 'B001'
  let numero = 1
  try {
    const guardado = Number(localStorage.getItem(`${LLAVE_SERIE}.${serie}`) ?? '0')
    numero = Number.isFinite(guardado) ? guardado + 1 : 1
    localStorage.setItem(`${LLAVE_SERIE}.${serie}`, String(numero))
  } catch {
    numero = Math.floor(Math.random() * 9000) + 1000
  }
  return { tipo, serie, numero: String(numero).padStart(8, '0') }
}

export class PagosSimulados implements PuertoPagos {
  async registrar(_ticketId: string, cobro: Cobro): Promise<ResultadoCobro> {
    // Un retardo corto a propósito: el panel enseña su estado de espera y
    // así se ve si bloquea doble envío, que es como se cobra dos veces.
    await new Promise((listo) => setTimeout(listo, 220))
    // El panel manda el TIPO de comprobante, no su número: la serie y el
    // correlativo los pone quien los custodia, que aquí es este adaptador y
    // mañana será SUNAT a través del microservicio. El POS no los inventa.
    return {
      estado: 'cobrado',
      pagoId: identificador('pago'),
      comprobante: siguienteComprobante(cobro.comprobante?.tipo ?? 'BOL'),
    }
  }
}

export { siguienteComprobante }
