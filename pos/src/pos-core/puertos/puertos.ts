/**
 * Puertos hacia el exterior.
 *
 * `pos-core` solo conoce estas interfaces; quién responde se decide al arrancar
 * la aplicación. Eso permite construir todo el front antes de que exista
 * KARMA.MS.POS, y es además el borrador del contrato que ese microservicio
 * tendrá que cumplir.
 *
 * Regla que no se rompe: toda llamada al back pasa por un puerto. Ningún
 * componente usa HTTP directamente.
 */
import type {
  ConsultaCatalogo,
  ContextoPrecio,
  CuentaPorCobrar,
  ProductoRef,
  ResultadoCobro,
  Ticket,
} from '../modelo'

export interface PuertoCatalogo {
  buscar(consulta: ConsultaCatalogo): Promise<ProductoRef[]>
}

export interface PuertoPrecios {
  precioDe(productoId: string, contexto: ContextoPrecio): Promise<number>
}

export interface PuertoStock {
  disponible(productoId: string, atributos?: unknown): Promise<number>
}

export interface PuertoTickets {
  guardar(ticket: Ticket): Promise<void>
  enviarACobro(ticketId: string): Promise<void>
  porCobrar(sucursalId: string): Promise<Ticket[]>
}

/**
 * El hueco que llenará KARMA.LIB.CAJA.
 *
 * Mientras no exista, detrás hay un diálogo simulado que marca el ticket como
 * cobrado. Después estará el componente `km-panel-cobro` del paquete
 * `@karmacorp/caja-angular`. El POS nunca registra pagos por su cuenta.
 */
export interface PuertoCobro {
  cajaAbierta(): Promise<boolean>
  cobrar(cuenta: CuentaPorCobrar): Promise<ResultadoCobro>
}
