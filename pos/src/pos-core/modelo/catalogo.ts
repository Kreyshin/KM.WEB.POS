/** Referencias de catálogo que viajan entre el buscador de un perfil y el carrito. */
import type { PresentacionVenta, UnidadMedida } from './unidades'

export interface ProductoRef {
  id: string
  descripcion: string
  /** En la que el almacén lleva la cuenta. Las ventas se convierten a ella. */
  unidadAlmacen: UnidadMedida
  /** Al menos una. La primera es la que se ofrece por defecto. */
  presentaciones: PresentacionVenta[]
  codigoBarras?: string
  /**
   * Una línea de contexto que compone el adaptador y nadie más interpreta:
   * «Paracetamol · Genfar» en una botica, «Algodón · Slim fit» en una tienda
   * de ropa. Permite que la lista genérica diga algo útil sin que el shell
   * sepa de rubros.
   */
  nota?: string
  /**
   * Categoría para agrupar y filtrar. No es de un rubro: toda tienda las
   * tiene —analgésicos en una botica, camisas en una de ropa—. El núcleo solo
   * la transporta; quién decide la lista es el catálogo.
   */
  categoria?: CategoriaRef
  /**
   * Clave del icono con el que se dibuja el producto.
   *
   * Es vocabulario compartido, no lógica de rubro: la capa de interfaz tiene
   * un juego de iconos genéricos —tableta, frasco, inyectable, caja— y el
   * adaptador dice cuál usar. Si no viene ninguno, se dibuja el genérico.
   */
  icono?: string
  /**
   * Ficha del producto: lo que se contesta cuando el cliente pregunta.
   *
   * Pares etiqueta/valor, sin estructura de rubro. En una botica son
   * principio activo, concentración, forma farmacéutica, laboratorio,
   * registro sanitario y condición de venta; en una tienda de ropa serían
   * composición, tejido y cuidados. El núcleo no interpreta ninguno: los
   * transporta para que la pantalla los enseñe tal cual.
   *
   * Está en el núcleo y no en `detalle` porque la pantalla genérica tiene
   * que poder pintarla sin saber de rubros. Qué campos hay y en qué orden
   * lo decide el catálogo.
   */
  ficha?: readonly CampoFicha[]
  /**
   * Existencias en unidad de ALMACÉN, si el catálogo las conoce.
   *
   * Opcional a propósito: el POS puede venderse sin control de stock, y al
   * contratar el módulo de almacén del ERP el mismo campo se llena desde
   * allí sin que la pantalla cambie.
   */
  stock?: number
  /**
   * Los ejes por los que se abre este producto en variantes.
   *
   * Una camisa es un producto con dos ejes —talla y color— y hasta
   * veinte combinaciones, cada una con su propio stock. No son
   * presentaciones: una presentación es otra FORMA DE VENDER lo mismo a
   * otro precio (blíster, caja); una variante es OTRO EJEMPLAR, al mismo
   * precio y con existencias propias.
   *
   * Está en el núcleo y no en el perfil de ropa porque no es de ropa:
   * un calzado tiene talla, una pintura color y litros, un teléfono
   * capacidad y color. Lo que cambia por rubro son los ejes, y esos los
   * pone el catálogo.
   */
  ejes?: readonly EjeVariante[]
  variantes?: readonly VarianteProducto[]
  /**
   * Los ejemplares identificados que hay en stock.
   *
   * Existe porque sin esto el mostrador no sabe QUÉ está entregando. El
   * primer intento pedía la serie como texto libre, y eso acepta
   * cualquier cosa: un número que la tienda no tiene, una errata, o el
   * mismo televisor vendido dos veces. Con la garantía de por medio, eso
   * se descubre meses después y ya no se puede corregir.
   *
   * Sirve para las dos formas de identificar que existen en retail, que
   * son la misma idea con otro nombre:
   *
   *   SERIE   un ejemplar concreto: una serie, un IMEI. Cantidad 1.
   *   LOTE    un grupo que comparte origen y vencimiento. Cantidad N.
   *
   * El núcleo no distingue entre las dos: las transporta y el perfil
   * decide cómo se llaman y en qué orden se ofrecen.
   */
  ejemplares?: readonly EjemplarProducto[]
}

export interface EjemplarProducto {
  /** La serie, el IMEI o el número de lote. Es lo que se imprime. */
  codigo: string
  /** Cuándo vence, si aplica. ISO. Lo usa el orden FEFO de una botica. */
  vence?: string
  /**
   * Cuántas unidades quedan de este ejemplar.
   *
   * Una serie siempre es 1 —por definición es un aparato—; un lote son
   * las que queden de ese lote.
   */
  cantidad: number
  /** Si la variante importa: la serie de la camisa M azul. */
  varianteId?: string
}

/**
 * Los ejemplares que se pueden vender ahora.
 *
 * Descarta los que están en cero y los vencidos. Un lote vencido sigue
 * en el sistema porque hay que darlo de baja y eso deja rastro, pero no
 * puede ofrecerse: venderlo es la infracción que cierra una botica.
 */
export function ejemplaresDisponibles(
  producto: ProductoRef,
  ahora = new Date(),
): readonly EjemplarProducto[] {
  return (producto.ejemplares ?? []).filter((ejemplar) => {
    if (ejemplar.cantidad <= 0) return false
    return !ejemplar.vence || new Date(ejemplar.vence) >= ahora
  })
}

/**
 * Ordena por vencimiento: lo que antes caduca, primero.
 *
 * FEFO, que en una botica no es una preferencia sino la forma de no
 * comerse el stock. Los que no vencen van al final, en su orden.
 */
export function porVencimiento(
  ejemplares: readonly EjemplarProducto[],
): readonly EjemplarProducto[] {
  return [...ejemplares].sort((a, b) => {
    if (!a.vence && !b.vence) return 0
    if (!a.vence) return 1
    if (!b.vence) return -1
    return a.vence.localeCompare(b.vence)
  })
}

export interface EjeVariante {
  /** 'talla', 'color'. Es la clave con la que viaja en `atributos`. */
  clave: string
  etiqueta: string
  /** En el orden en que se enseñan: S, M, L, XL, no alfabético. */
  valores: readonly string[]
}

export interface VarianteProducto {
  id: string
  /** Un valor por eje: { talla: 'M', color: 'Azul' }. */
  atributos: Readonly<Record<string, string>>
  /** Existencias de ESTA combinación. Cero es agotado, no inexistente. */
  stock?: number
  /** Solo si esta combinación cuesta distinto. Normalmente no. */
  precio?: number
  codigoBarras?: string
}

/** La variante que corresponde a una combinación, si existe y hay stock. */
export function varianteDe(
  producto: ProductoRef,
  elegido: Readonly<Record<string, string>>,
): VarianteProducto | null {
  return (
    producto.variantes?.find((variante) =>
      Object.entries(elegido).every(([clave, valor]) => variante.atributos[clave] === valor),
    ) ?? null
  )
}

/** Un dato de la ficha. `destacado` lo sube a la cabecera del panel. */
export interface CampoFicha {
  etiqueta: string
  valor: string
  destacado?: boolean
}

export interface CategoriaRef {
  codigo: string
  nombre: string
}

export interface ResultadoBusqueda extends ProductoRef {
  /** Pistas que el perfil muestra en su propia pantalla de venta. */
  detalle?: Record<string, unknown>
}

export interface ConsultaCatalogo {
  texto?: string
  codigoBarras?: string
  /** Código de categoría. Sin él se busca en todo el catálogo. */
  categoria?: string
  /**
   * Filtros avanzados, por clave de faceta.
   *
   * Genérico a propósito: el núcleo no sabe que existe «laboratorio» ni
   * «condición de venta». Las claves salen de las facetas que publica el
   * propio catálogo, así que un rubro puede filtrar por talla y otro por
   * laboratorio sin tocar este contrato ni la pantalla.
   */
  filtros?: Readonly<Record<string, string>>
  orden?: OrdenCatalogo
  sucursalId: string
  limite?: number
}

export type OrdenCatalogo = 'relevancia' | 'nombre' | 'precio-asc' | 'precio-desc'

/**
 * Un filtro que el catálogo publica para que la pantalla lo dibuje.
 *
 * La pantalla de venta pinta las facetas que reciba, con sus cuentas, sin
 * conocer ninguna. Es lo que permite tener filtros de verdad sin meter
 * farmacia en el shell.
 */
export interface Faceta {
  clave: string
  etiqueta: string
  opciones: readonly OpcionFaceta[]
}

export interface OpcionFaceta {
  valor: string
  etiqueta: string
  cuantos: number
}

export interface ContextoPrecio {
  sucursalId: string
  clienteId?: string
  cantidad: number
}
