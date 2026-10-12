import type {
  DatoLinea,
  CampoLinea,
  LineaTicket,
  MarcaProducto,
  ProductoRef,
  Validacion,
} from '@pos-core/index'
import { ejemplaresDisponibles, validacionFalla, validacionOk } from '@pos-core/index'
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

  /*
   * Una serie es, por definición, UN aparato: ni cantidad ni vencimiento.
   * Registrarlas aquí es lo que permite que la garantía se pueda tramitar
   * meses después contra el número que figura en el comprobante.
   */
  ejemploProducto: {
    descripcion: 'Televisor LED 55" 4K',
    codigoBarras: '7752000100011',
    categoria: 'Televisores',
  },

  ejemplaresDeProducto: {
    etiqueta: 'Series en tienda',
    singular: 'Serie o IMEI',
    conVencimiento: false,
    conCantidad: false,
    ayuda: 'Lo que se entrega se elige de esta lista: no se teclea al vender.',
  },

  detalleDeLinea(linea: LineaTicket<AtributosTecnologia>): readonly DatoLinea[] {
    // Un cable no lleva serie y no tiene nada que enseñar aquí: una
    // etiqueta vacía en cada línea sería ruido en la columna más estrecha
    // de la pantalla.
    if (!linea.atributos.serie) return []
    return [{ etiqueta: 'Serie', valor: linea.atributos.serie }]
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
   * La serie SE ELIGE de las que hay, no se teclea.
   *
   * Tecleada a mano acepta cualquier cosa: un número que la tienda no
   * tiene, una errata de un dígito, o el mismo televisor vendido dos
   * veces. Con la garantía de por medio eso se descubre meses después,
   * cuando el cliente reclama y la serie de su factura no existe en el
   * sistema. Eligiendo de la lista, el error no se puede cometer.
   *
   * Y solo a lo que la lleva: un cable HDMI entra de un toque. Pedir
   * serie a todo es la forma más rápida de que el vendedor deje de
   * registrarla, y entonces no la tendría justo cuando hace falta.
   */
  camposDeLinea(producto: ProductoRef): readonly CampoLinea[] {
    if (!llevaSerie(producto)) return []

    const disponibles = ejemplaresDisponibles(producto)
    if (disponibles.length === 0) {
      // Sin series registradas, pedirlas de la lista es imposible. Se
      // acepta tecleada antes que bloquear una venta: el dato a medias
      // vale más que no vender.
      return [
        {
          clave: 'serie',
          etiqueta: 'Número de serie o IMEI',
          tipo: 'texto',
          requerido: true,
          ayuda: 'No hay series registradas de este equipo: escríbela de la caja.',
        },
      ]
    }

    return [
      {
        clave: 'serie',
        etiqueta: 'Equipo que se entrega',
        tipo: 'opcion',
        requerido: true,
        opciones: disponibles.map((ejemplar) => ({
          valor: ejemplar.codigo,
          etiqueta: ejemplar.codigo,
        })),
        ayuda: `${disponibles.length} en tienda. La serie va al comprobante y es con la que se reclama la garantía.`,
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
    if (sinSerie.length > 0) {
      return validacionFalla(
        sinSerie.length === 1
          ? `Falta el número de serie de ${sinSerie[0].descripcion}.`
          : `Faltan los números de serie de ${sinSerie.length} equipos.`,
      )
    }

    /*
     * Una serie es UN aparato.
     *
     * Hace falta desde que la cantidad se teclea en el carrito: escribir 12
     * sobre un televisor con su serie anotada factura doce aparatos contra
     * un solo número, y el día de la garantía once clientes traen un papel
     * que no corresponde a lo que tienen en casa.
     */
    const repetido = ticket.lineas.find(
      (linea) => (linea.atributos as AtributosTecnologia).serie && linea.cantidad > 1,
    )
    if (repetido) {
      return validacionFalla(
        `${repetido.descripcion} lleva una serie anotada, así que son ${repetido.cantidad} líneas de uno, no una de ${repetido.cantidad}.`,
      )
    }

    /*
     * Y ninguna serie repetida.
     *
     * Dos líneas con el mismo número son dos aparatos vendidos y uno
     * entregado, o el mismo contado dos veces. Las dos acaban en una
     * garantía que no se puede atender.
     */
    const vistas = new Set<string>()
    for (const linea of ticket.lineas) {
      const serie = (linea.atributos as AtributosTecnologia).serie
      if (!serie) continue
      if (vistas.has(serie)) {
        return validacionFalla(`La serie ${serie} está dos veces en el ticket.`)
      }
      vistas.add(serie)
    }

    return validacionOk
  },
}
