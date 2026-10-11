import type {
  CampoLinea,
  LineaTicket,
  MarcaProducto,
  ProductoRef,
  Validacion,
} from '@pos-core/index'
import { validacionFalla, validacionOk } from '@pos-core/index'
import type { PerfilRubroAngular } from '@pos-core-ui/index'

/**
 * Perfil de rubro: tecnología.
 *
 * Entra para comprobar UNA cosa: que `camposDeLinea` sirve para algo que
 * no sea una receta. Si solo funcionara en farmacia sería un gancho a
 * medida disfrazado de contrato, y este repo se apoya entero en que no lo
 * sea.
 *
 * Es el perfil más barato posible, y eso también es la prueba: no trae
 * pantalla —la rejilla genérica con facetas y ficha le sirve— ni toca el
 * núcleo. Son cuatro funciones.
 *
 * Lo propio del rubro es que **cada ejemplar se identifica**. Un televisor
 * no se vende «uno»: se vende ESE, con su serie, porque la garantía va
 * contra el número y sin él la tienda no puede responder por el equipo ni
 * tramitar un cambio.
 */

export interface AtributosTecnologia extends Record<string, unknown> {
  /** Serie o IMEI del ejemplar entregado. */
  serie?: string
  /** Meses de garantía, copiados de la ficha al vender. */
  garantia?: string
}

/** Qué categorías se entregan con serie. Lo decide el catálogo. */
const CON_SERIE = ['TELEV', 'CELUL', 'COMPU']

function llevaSerie(producto: ProductoRef): boolean {
  return CON_SERIE.includes(producto.categoria?.codigo ?? '')
}

function garantiaDe(producto: ProductoRef): string | undefined {
  return producto.ficha?.find((campo) => campo.etiqueta === 'Garantía')?.valor
}

export const perfilTecnologia: PerfilRubroAngular<AtributosTecnologia> = {
  codigo: 'tecnologia',
  nombre: 'Tecnología',

  describirLinea(linea: LineaTicket<AtributosTecnologia>): string {
    // La serie entra en la descripción porque acaba impresa en el
    // comprobante, y es el papel con el que el cliente reclama garantía.
    return linea.atributos.serie
      ? `${linea.descripcion} · serie ${linea.atributos.serie}`
      : linea.descripcion
  },

  marcasDeProducto(producto: ProductoRef): readonly MarcaProducto[] {
    const marcas: MarcaProducto[] = []
    const garantia = garantiaDe(producto)
    if (garantia) {
      marcas.push({ texto: 'garantía', tono: 'info', detalle: garantia })
    }
    // Con dos o menos, ofrecer el de exhibición deja de ser una opción y
    // pasa a ser la venta. El vendedor tiene que saberlo antes de
    // prometer uno nuevo en caja.
    if (producto.stock !== undefined && producto.stock > 0 && producto.stock <= 2) {
      marcas.push({
        texto: `últimas ${producto.stock}`,
        tono: 'aviso',
        detalle: 'Quedan muy pocas unidades: confirma antes de prometer entrega.',
      })
    }
    return marcas
  },

  /**
   * La serie, y solo a lo que la lleva.
   *
   * Un cable HDMI entra de un toque. Pedir número de serie a todo sería
   * la forma más rápida de que el vendedor deje de registrarla, y
   * entonces no la tendría justo cuando hace falta.
   */
  camposDeLinea(producto: ProductoRef): readonly CampoLinea[] {
    if (!llevaSerie(producto)) return []
    return [
      {
        clave: 'serie',
        etiqueta: 'Número de serie o IMEI',
        tipo: 'texto',
        requerido: true,
        ayuda: 'El de la caja del equipo que se entrega. Va al comprobante.',
      },
    ]
  },

  atributosIniciales(producto: ProductoRef): Record<string, unknown> {
    const iniciales: Record<string, unknown> = {}
    if (llevaSerie(producto)) iniciales['exigeSerie'] = true
    const garantia = garantiaDe(producto)
    if (garantia) iniciales['garantia'] = garantia
    return iniciales
  },

  /**
   * Red de seguridad: ningún equipo sale sin serie registrada.
   *
   * No debería saltar por el camino normal, porque ya se pide al
   * agregar. Está por los que no pasan por ahí —un ticket aparcado y
   * retomado— y porque vender un televisor sin serie es quedarse sin
   * poder tramitar su garantía después.
   */
  async validarAntesDeCobrar(ticket): Promise<Validacion> {
    const sinSerie = ticket.lineas.filter((linea) => {
      const atributos = linea.atributos as AtributosTecnologia
      return atributos['exigeSerie'] === true && !atributos.serie
    })
    if (sinSerie.length === 0) return validacionOk
    return validacionFalla(
      sinSerie.length === 1
        ? `Falta el número de serie de ${sinSerie[0].descripcion}.`
        : `Faltan los números de serie de ${sinSerie.length} equipos.`,
    )
  },
}
