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

/**
 * Un dato que el perfil necesita ANTES de meter la línea al ticket.
 *
 * Es el punto de extensión que faltaba, y el que separa un POS de verdad
 * de una calculadora: casi todo rubro pide algo que no está en el
 * catálogo sino en el mostrador. El número de receta en una botica, la
 * talla y el color en una tienda de ropa, la serie o el IMEI en una de
 * tecnología. Son datos del EJEMPLAR que se entrega, no del producto.
 *
 * Preguntarlo al agregar y no al cobrar es deliberado: al cobrar el
 * cliente ya tiene el dinero en la mano, y descubrir ahí que falta la
 * serie del televisor para la garantía es parar la cola.
 *
 * El núcleo no interpreta ninguno. Los recoge y los deja en `atributos`,
 * que es justo para lo que existe.
 */
/**
 * Cómo se llaman y se comportan los ejemplares de un rubro.
 *
 *   SERIE   un aparato concreto: un IMEI, un número de serie. Cantidad 1.
 *   LOTE    un grupo con origen y vencimiento. Cantidad N.
 *
 * Son la misma idea con otro nombre, y por eso el núcleo las transporta
 * igual y solo cambia cómo se presentan.
 */
export interface FormaEjemplar {
  /** Título de la sección: «Series registradas», «Lotes en stock». */
  etiqueta: string
  /** Cómo se llama UNO: «Serie», «Lote». Va en el encabezado de la columna. */
  singular: string
  /** Si lleva fecha de vencimiento. Una botica sí, una tienda de aparatos no. */
  conVencimiento: boolean
  /** Si cada ejemplar puede tener más de una unidad. Una serie no; un lote sí. */
  conCantidad: boolean
  /** Una línea que explique para qué sirve en este rubro. */
  ayuda?: string
}

/** Un dato del rubro en una línea del carrito. */
export interface DatoLinea {
  etiqueta: string
  valor: string
  /** `aviso` para lo que hay que mirar dos veces: un lote a punto de vencer. */
  tono?: 'neutro' | 'aviso'
}

export interface CampoLinea {
  clave: string
  etiqueta: string
  tipo: 'texto' | 'numero' | 'fecha' | 'opcion'
  /** Solo para `opcion`. */
  opciones?: readonly { valor: string; etiqueta: string }[]
  requerido: boolean
  ayuda?: string
  /** Para que el teclado del móvil salga bien y el escáner no estorbe. */
  modo?: 'numerico' | 'texto'
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
   * Los datos del rubro de una línea, por separado y con su nombre.
   *
   * `describirLinea` compone UNA frase, y eso está bien en el recibo. En
   * el carrito no: «Amoxicilina 500 mg · Blíster x10 · lote LT-5540 ·
   * receta RX-7788» no cabe en una columna de 22rem y lo que se recorta es
   * justo el lote, que es lo que el cajero contrasta contra la caja.
   *
   * Aquí llegan sueltos para poder pintarlos como etiquetas bajo el
   * nombre, donde se ven enteros y se leen de un vistazo.
   */
  detalleDeLinea?(linea: LineaTicket<A>): readonly DatoLinea[]
  /**
   * Cómo llama este rubro a lo que identifica un ejemplar, y si caduca.
   *
   * Sin esto el catálogo no tenía DÓNDE dar de alta una serie ni un lote:
   * `ProductoRef.ejemplares` existía, la pantalla de venta los ofrecía, y
   * el único modo de meterlos era editar el código del catálogo simulado.
   * Un dato que el sistema exige al vender y no deja registrar es un dato
   * que el negocio acaba no teniendo.
   *
   * Es una descripción, no una pantalla: el editor de producto es el mismo
   * para todos y lee esto para titular la sección y decidir si pide fecha
   * de vencimiento. Un rubro que no lo declara no enseña la sección, que
   * es lo correcto en una tienda de ropa —ahí lo que identifica es la
   * variante, no un número—.
   */
  ejemplaresDeProducto?: FormaEjemplar
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
  /**
   * Qué hay que preguntar antes de agregar este producto.
   *
   * Devolver nada —o no implementarlo— es el caso normal: se agrega de un
   * toque, que es como se vende el 90 % de las cosas. Solo lo que de
   * verdad lo necesita abre un paso extra.
   */
  camposDeLinea?(producto: ProductoRef, presentacionId: string): readonly CampoLinea[]
  /**
   * Atributos que el perfil estampa en la línea sin preguntar.
   *
   * Lo que el perfil deduce del producto y necesita recordar después: que
   * esta línea exigía receta, que esa prenda venía de la matriz de tallas.
   * Sin esto, la validación previa al cobro tendría que volver a consultar
   * el catálogo producto por producto para saber qué era cada línea.
   */
  atributosIniciales?(producto: ProductoRef, presentacionId: string): Record<string, unknown>
  validarLinea?(linea: LineaTicket<A>, ticket: Ticket): Promise<Validacion>
  validarAntesDeCobrar?(ticket: Ticket): Promise<Validacion>
  mediosDePagoExtra?: MedioPagoRef[]
}

/** Carga diferida de un perfil: lo que guarda el registro del shell. */
export type CargadorPerfil<TPantalla = unknown> = () => Promise<
  PerfilRubro<Record<string, unknown>, TPantalla>
>
