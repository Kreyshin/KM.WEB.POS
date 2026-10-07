/** Referencias de catálogo que viajan entre el buscador de un perfil y el carrito. */

export interface ProductoRef {
  id: string
  descripcion: string
  precio: number
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
