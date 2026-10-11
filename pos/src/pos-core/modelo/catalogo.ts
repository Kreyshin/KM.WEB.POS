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
  sucursalId: string
  limite?: number
}

export interface ContextoPrecio {
  sucursalId: string
  clienteId?: string
  cantidad: number
}
