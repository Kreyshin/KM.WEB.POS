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
import type { LineaTicket, MedioPagoRef, ProductoRef, ResultadoBusqueda, Ticket } from '../modelo'

export interface Validacion {
  ok: boolean
  mensaje?: string
}

export const validacionOk: Validacion = { ok: true }

export function validacionFalla(mensaje: string): Validacion {
  return { ok: false, mensaje }
}

/**
 * Una marca que el perfil cuelga de un producto en la pantalla de venta.
 *
 * Existe porque el shell NO puede saber qué es una receta. Antes lo sabía:
 * buscaba la cadena «exige receta» dentro de la nota del producto, que es
 * conocimiento de farmacia escrito en la pantalla genérica. El día que
 * entre ropa habría hecho falta otro `if`, y ese es exactamente el camino
 * que el contrato del perfil existe para cerrar.
 *
 * El tono es semántico, no un color: qué color es cada tono lo decide el
 * tema, no el perfil.
 */
export interface MarcaProducto {
  texto: string
  tono: 'aviso' | 'error' | 'info' | 'exito' | 'neutro'
  /** Texto largo para el title, si hace falta explicar la marca. */
  detalle?: string
}

export interface BuscadorProductos {
  buscar(texto: string): Promise<ResultadoBusqueda[]>
  porCodigoBarras(codigo: string): Promise<ResultadoBusqueda | null>
}

export interface PerfilRubro<A = Record<string, unknown>, TPantalla = unknown> {
  /** 'ropa', 'farmacia', ... */
  codigo: string
  nombre: string
  /**
   * Componente que ocupa la zona de venta.
   *
   * OPCIONAL. El shell trae una pantalla de mostrador genérica —rejilla,
   * filtros por facetas y ficha— que no sabe de rubros: pinta lo que el
   * catálogo publique. A la mayoría le sirve, y entonces el perfil solo
   * aporta reglas y marcas. Se declara una propia cuando el gesto de venta
   * cambia de verdad: la matriz de talla y color de una tienda de ropa no
   * es una rejilla con filtros.
   */
  pantallaVenta?: TPantalla
  /** Opcional: sin él, la pantalla genérica usa el PuertoCatalogo. */
  buscador?: BuscadorProductos
  /** Texto de la línea en el carrito y en el comprobante. */
  describirLinea(linea: LineaTicket<A>): string
  /**
   * Marcas del producto en la pantalla de venta: receta, frío, peligroso.
   * Lo que el cajero tiene que ver sin abrir la ficha.
   */
  marcasDeProducto?(producto: ProductoRef): readonly MarcaProducto[]
  /**
   * Limpia la nota de contexto de lo que ya se enseña como marca, para no
   * decir dos veces lo mismo en la misma fila.
   */
  limpiarNota?(nota: string): string
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
