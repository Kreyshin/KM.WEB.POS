/**
 * Contrato del perfil de rubro.
 *
 * Un perfil aporta cuatro cosas: cómo se busca, cómo se ve la pantalla de
 * venta, qué atributos lleva la línea y qué reglas se validan. Agregar un
 * rubro nuevo es escribir un objeto que cumpla esto; el núcleo no se toca.
 *
 * `TPantalla` existe para que este archivo no importe nada de Angular. El
 * núcleo solo necesita saber que el perfil TRAE una pantalla y poder pasarla
 * al shell; qué es una pantalla lo define la capa de UI, en
 * `pos-core-ui/perfil`, donde `TPantalla` se fija a `Type<unknown>`. Así el
 * modelo, los puertos y este contrato siguen siendo TypeScript puro y los
 * reutiliza cualquier front de la suite.
 */
import type { LineaTicket, MedioPagoRef, ResultadoBusqueda, Ticket } from '../modelo'

export interface Validacion {
  ok: boolean
  mensaje?: string
}

export const validacionOk: Validacion = { ok: true }

export function validacionFalla(mensaje: string): Validacion {
  return { ok: false, mensaje }
}

export interface BuscadorProductos {
  buscar(texto: string): Promise<ResultadoBusqueda[]>
  porCodigoBarras(codigo: string): Promise<ResultadoBusqueda | null>
}

export interface PerfilRubro<A = Record<string, unknown>, TPantalla = unknown> {
  /** 'ropa', 'farmacia', ... */
  codigo: string
  nombre: string
  /** Componente que ocupa la zona de venta. */
  pantallaVenta: TPantalla
  buscador: BuscadorProductos
  /** Texto de la línea en el carrito y en el comprobante. */
  describirLinea(linea: LineaTicket<A>): string
  /**
   * Validaciones de respuesta inmediata en pantalla. La regla definitiva la
   * aplica el microservicio del vertical: esto es cortesía, no autoridad.
   */
  validarLinea?(linea: LineaTicket<A>, ticket: Ticket): Promise<Validacion>
  validarAntesDeCobrar?(ticket: Ticket): Promise<Validacion>
  mediosDePagoExtra?: MedioPagoRef[]
}

/** Carga diferida de un perfil: lo que guarda el registro del shell. */
export type CargadorPerfil<TPantalla = unknown> = () => Promise<
  PerfilRubro<Record<string, unknown>, TPantalla>
>
