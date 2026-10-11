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
}

export interface ResultadoBusqueda extends ProductoRef {
  /** Pistas que el perfil muestra en su propia pantalla de venta. */
  detalle?: Record<string, unknown>
}

export interface ConsultaCatalogo {
  texto?: string
  codigoBarras?: string
  sucursalId: string
  limite?: number
}

export interface ContextoPrecio {
  sucursalId: string
  clienteId?: string
  cantidad: number
}
