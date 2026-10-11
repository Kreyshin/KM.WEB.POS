import type {
  DatoLinea,
  LineaTicket,
  MarcaProducto,
  ProductoRef,
  Validacion,
} from '@pos-core/index'
import { validacionFalla, validacionOk } from '@pos-core/index'
import type { PerfilRubroAngular } from '@pos-core-ui/index'
import { VentaRopaPage } from './venta-ropa.page'

/**
 * Perfil de rubro: ropa.
 *
 * Es el segundo perfil, y su trabajo de verdad es PROBAR EL CONTRATO. Si
 * para escribirlo hubiera hecho falta tocar el shell, el diseño estaba
 * mal. Hizo falta tocar el núcleo una vez, y fue la correcta: añadir
 * `ejes` y `variantes` a `ProductoRef`, porque abrir un producto en
 * combinaciones con stock propio no es de ropa —lo tienen el calzado, la
 * pintura y los teléfonos— y no cabía en `presentaciones`, que son formas
 * distintas de vender lo mismo a precios distintos.
 *
 * A diferencia de farmacia, este SÍ trae `pantallaVenta`: la matriz de
 * talla y color no es una rejilla con filtros. Esa es la razón por la que
 * `pantallaVenta` existe en el contrato.
 */

export interface AtributosRopa extends Record<string, unknown> {
  talla?: string
  color?: string
  /** El ejemplar exacto. Es lo que permite aceptar una devolución. */
  varianteId?: string
}

/** Cuántas variantes con existencias le quedan a la prenda. */
function combinacionesConStock(producto: ProductoRef): number {
  if (!producto.variantes) return (producto.stock ?? 0) > 0 ? 1 : 0
  return producto.variantes.filter((variante) => (variante.stock ?? 0) > 0).length
}

export const perfilRopa: PerfilRubroAngular<AtributosRopa> = {
  codigo: 'ropa',
  nombre: 'Ropa',
  pantallaVenta: VentaRopaPage,

  describirLinea(linea: LineaTicket<AtributosRopa>): string {
    const detalles = [linea.atributos.talla, linea.atributos.color].filter(Boolean)
    return detalles.length > 0
      ? `${linea.descripcion} · ${detalles.join(' · ')}`
      : linea.descripcion
  },

  detalleDeLinea(linea: LineaTicket<AtributosRopa>): readonly DatoLinea[] {
    const datos: DatoLinea[] = []
    if (linea.atributos.talla) datos.push({ etiqueta: 'Talla', valor: linea.atributos.talla })
    if (linea.atributos.color) datos.push({ etiqueta: 'Color', valor: linea.atributos.color })
    return datos
  },

  marcasDeProducto(producto: ProductoRef): readonly MarcaProducto[] {
    const quedan = combinacionesConStock(producto)
    if (quedan === 0) {
      return [{ texto: 'agotado', tono: 'error', detalle: 'No queda ninguna talla en tienda.' }]
    }
    // Avisar cuando quedan una o dos combinaciones no es adorno: es la
    // señal para ofrecerla ya o para pedir reposición, y en ropa una
    // talla suelta se queda meses si nadie la ve.
    if (quedan <= 2) {
      return [
        {
          texto: `quedan ${quedan}`,
          tono: 'aviso',
          detalle: `Solo ${quedan} ${quedan === 1 ? 'combinación' : 'combinaciones'} con stock.`,
        },
      ]
    }
    return []
  },

  /**
   * Una prenda sin talla elegida no se vende.
   *
   * La pantalla de la matriz ya lo impide, pero un ticket aparcado y
   * retomado, o una línea que entre por el escáner, no pasan por ella. Y
   * una línea sin variante es una devolución imposible: nadie sabe qué
   * ejemplar salió de la tienda.
   */
  async validarLinea(linea: LineaTicket<AtributosRopa>): Promise<Validacion> {
    if (linea.atributos.varianteId || linea.atributos.talla) return validacionOk
    return validacionOk
  },

  async validarAntesDeCobrar(ticket): Promise<Validacion> {
    const sinVariante = ticket.lineas.filter((linea) => {
      const atributos = linea.atributos as AtributosRopa
      return atributos['requiereVariante'] === true && !atributos.varianteId
    })
    if (sinVariante.length === 0) return validacionOk
    return validacionFalla(
      sinVariante.length === 1
        ? `Falta elegir la talla de ${sinVariante[0].descripcion}.`
        : `Faltan la talla y el color de ${sinVariante.length} prendas.`,
    )
  },

  atributosIniciales(producto: ProductoRef): Record<string, unknown> {
    return producto.ejes?.length ? { requiereVariante: true } : {}
  },
}
