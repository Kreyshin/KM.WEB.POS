import type { Provider } from '@angular/core'
import {
  PUERTO_CAJA,
  PUERTO_CATALOGO,
  PUERTO_MEDIOS_PAGO,
  PUERTO_PAGOS,
  PUERTO_SESION,
} from '@pos-core-ui/index'
import {
  CajaSimulada,
  CatalogoSimulado,
  MediosPagoSimulados,
  PagosSimulados,
  SesionSimulada,
} from '@pos-adaptadores/simulado/index'

/**
 * Quién responde detrás de cada puerto.
 *
 * Este archivo es la bisagra de toda la arquitectura: pasar de simulado a real
 * es cambiar esta lista, y nada más. Ningún componente sabe si detrás hay una
 * implementación en memoria o un cliente HTTP contra KARMA.MS.POS.
 *
 * Caja, medios de pago y registro de pagos son el sustituto de
 * KARMA.LIB.CAJA: el día que esa librería exista se cambian estas tres
 * líneas y ninguna pantalla se entera. Los puertos de precios, stock y
 * tickets se registran cuando sus adaptadores existan.
 */
export const proveedoresSimulados: Provider[] = [
  { provide: PUERTO_SESION, useClass: SesionSimulada },
  { provide: PUERTO_CATALOGO, useClass: CatalogoSimulado },
  { provide: PUERTO_CAJA, useClass: CajaSimulada },
  { provide: PUERTO_MEDIOS_PAGO, useClass: MediosPagoSimulados },
  { provide: PUERTO_PAGOS, useClass: PagosSimulados },
]
