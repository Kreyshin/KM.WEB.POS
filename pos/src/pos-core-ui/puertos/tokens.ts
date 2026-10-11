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
  PuertoCaja,
  PuertoCatalogo,
  PuertoClientes,
  PuertoCobro,
  PuertoHojaCatalogo,
  PuertoMantenimientoCatalogo,
  PuertoMediosPago,
  PuertoPagos,
  PuertoPrecios,
  PuertoSesion,
  PuertoStock,
  PuertoTickets,
  PuertoTurnos,
} from '@pos-core/index'

export const PUERTO_CATALOGO = new InjectionToken<PuertoCatalogo>('PuertoCatalogo')
export const PUERTO_PRECIOS = new InjectionToken<PuertoPrecios>('PuertoPrecios')
export const PUERTO_STOCK = new InjectionToken<PuertoStock>('PuertoStock')
export const PUERTO_TICKETS = new InjectionToken<PuertoTickets>('PuertoTickets')
export const PUERTO_COBRO = new InjectionToken<PuertoCobro>('PuertoCobro')
export const PUERTO_SESION = new InjectionToken<PuertoSesion>('PuertoSesion')
export const PUERTO_CLIENTES = new InjectionToken<PuertoClientes>('PuertoClientes')
export const PUERTO_MANTENIMIENTO_CATALOGO = new InjectionToken<PuertoMantenimientoCatalogo>(
  'PuertoMantenimientoCatalogo',
)
export const PUERTO_HOJA_CATALOGO = new InjectionToken<PuertoHojaCatalogo>('PuertoHojaCatalogo')
export const PUERTO_TURNOS = new InjectionToken<PuertoTurnos>('PuertoTurnos')
export const PUERTO_CAJA = new InjectionToken<PuertoCaja>('PuertoCaja')
export const PUERTO_MEDIOS_PAGO = new InjectionToken<PuertoMediosPago>('PuertoMediosPago')
export const PUERTO_PAGOS = new InjectionToken<PuertoPagos>('PuertoPagos')
