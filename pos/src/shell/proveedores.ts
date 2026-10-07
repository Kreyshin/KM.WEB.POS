import type { Provider } from '@angular/core'
import { PUERTO_SESION } from '@pos-core-ui/index'
import { SesionSimulada } from '@pos-adaptadores/simulado/index'

/**
 * Quién responde detrás de cada puerto.
 *
 * Este archivo es la bisagra de toda la arquitectura: pasar de simulado a real
 * es cambiar esta lista, y nada más. Ningún componente sabe si detrás hay una
 * implementación en memoria o un cliente HTTP contra KARMA.MS.POS.
 *
 * Los demás puertos (catálogo, precios, stock, tickets, cobro) se registran
 * aquí cuando sus adaptadores existan, en los hitos 2 y 5.
 */
export const proveedoresSimulados: Provider[] = [
  { provide: PUERTO_SESION, useClass: SesionSimulada },
]
