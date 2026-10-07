/**
 * Tokens de inyección de los puertos.
 *
 * Están en la capa de UI y no en `pos-core` porque `InjectionToken` es de
 * Angular y el núcleo es puro. El efecto buscado se mantiene: pasar de
 * simulado a real es cambiar la lista de proveedores del shell, sin tocar
 * ningún componente.
 */
import { InjectionToken } from '@angular/core'
import type {
  PuertoCatalogo,
  PuertoCobro,
  PuertoPrecios,
  PuertoSesion,
  PuertoStock,
  PuertoTickets,
} from '@pos-core/index'

export const PUERTO_CATALOGO = new InjectionToken<PuertoCatalogo>('PuertoCatalogo')
export const PUERTO_PRECIOS = new InjectionToken<PuertoPrecios>('PuertoPrecios')
export const PUERTO_STOCK = new InjectionToken<PuertoStock>('PuertoStock')
export const PUERTO_TICKETS = new InjectionToken<PuertoTickets>('PuertoTickets')
export const PUERTO_COBRO = new InjectionToken<PuertoCobro>('PuertoCobro')
export const PUERTO_SESION = new InjectionToken<PuertoSesion>('PuertoSesion')
