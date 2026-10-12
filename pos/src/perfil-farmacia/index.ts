import type {
  DatoLinea,
  CampoLinea,
  LineaTicket,
  MarcaProducto,
  ProductoRef,
  Ticket,
  Validacion,
} from '@pos-core/index'
import {
  ejemplaresDisponibles,
  porVencimiento,
  validacionFalla,
  validacionOk,
} from '@pos-core/index'
import type { PerfilRubroAngular } from '@pos-core-ui/index'

/**
 * Perfil de rubro: farmacia.
 *
 * Esto es lo ÚNICO del repo que sabe qué es una receta.
 *
 * Antes no era así: el shell buscaba la cadena «exige receta» dentro de la
 * nota del producto para pintar la marca. Funcionaba, y era justo el error
 * que el contrato del perfil existe para impedir: conocimiento de un rubro
 * escrito en la pantalla que comparten todos. Con ropa dentro habría hecho
 * falta otro `if` en el mismo sitio.
 *
 * No trae `pantallaVenta`: la pantalla genérica del shell —rejilla, filtros
 * por facetas y ficha— ya le sirve a una botica, porque pinta lo que el
 * catálogo publique sin interpretarlo. Ropa sí traerá la suya, porque una
 * matriz de talla y color no es una rejilla con filtros.
 *
 * Solo puede importar `pos-core` y `pos-core-ui`: nunca el otro perfil, los
 * adaptadores ni el shell. El lint lo verifica.
 */

/**
 * Atributos que esta vertical cuelga de una línea.
 *
 * `numeroReceta` es lo ÚNICO que se pide hoy, y es una decisión tomada
 * mirando lo que de verdad hace una botica en Perú: se anota el número y
 * ya está. Médico, colegiatura, paciente y el libro de controlados son
 * ampliaciones reales, pero exigirlas desde el primer día haría la venta
 * más lenta que la competencia por un dato que casi nadie fiscaliza en el
 * mostrador.
 *
 * Crecer es añadir campos aquí y en `camposDeLinea`. Nada más se entera:
 * el núcleo transporta `atributos` sin leerlos.
 */
export interface AtributosFarmacia extends Record<string, unknown> {
  /** Número de la receta. Lo exige el producto, no el ticket. */
  numeroReceta?: string
  /** Para cuando llegue el control por lote. Hoy no se pide. */
  lote?: string
  vencimiento?: string
}

/**
 * Cómo se reconoce un producto con receta.
 *
 * Hoy el catálogo lo dice en la ficha, en el campo «Condición de venta».
 * Es una convención de datos y vive aquí, no en el shell: el día que el
 * microservicio mande una bandera propia, se cambia esta función y nadie
 * más se entera.
 */
/** «03/2027». El día no importa para decidir qué caja sacar. */
function mesAnio(iso?: string): string {
  if (!iso) return 'sin fecha'
  const fecha = new Date(iso)
  return `${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`
}

function exigeReceta(producto: ProductoRef): boolean {
  return (
    producto.ficha?.some(
      (campo) => campo.etiqueta === 'Condición de venta' && campo.valor === 'Con receta',
    ) === true || producto.nota?.includes('exige receta') === true
  )
}

/** Menos de tres meses. Se sigue vendiendo, pero se mira la caja. */
function venceCerca(vence?: string): boolean {
  if (!vence) return false
  const tres = new Date()
  tres.setMonth(tres.getMonth() + 3)
  return new Date(vence) <= tres
}

export const perfilFarmacia: PerfilRubroAngular<AtributosFarmacia> = {
  codigo: 'farmacia',
  nombre: 'Farmacia',

  /*
   * El lote va PRIMERO entre los detalles, antes que la receta.
   *
   * Es lo que el cajero contrasta contra la caja que tiene en la mano
   * mientras la línea está en pantalla, y lo que permite rastrear una
   * alerta sanitaria después. La receta ya la tiene delante en papel.
   */
  describirLinea(linea: LineaTicket<AtributosFarmacia>): string {
    const partes = [linea.descripcion, linea.unidad.nombre]
    if (linea.atributos.lote) partes.push(`lote ${linea.atributos.lote}`)
    if (linea.atributos.numeroReceta) partes.push(`receta ${linea.atributos.numeroReceta}`)
    return partes.join(' · ')
  },

  /**
   * Los mismos datos, sueltos, para el carrito.
   *
   * El lote lleva aviso si vence en menos de tres meses: no impide
   * venderlo —sería tirar stock bueno— pero es lo que hace que el cajero
   * mire la caja antes de entregarla, que es cuando todavía se puede
   * cambiar por otra.
   */
  /*
   * Un lote agrupa unidades con el mismo origen y la misma fecha, así que
   * lleva cantidad y vencimiento. Es lo que hace posible el orden FEFO y lo
   * que permite rastrear una alerta sanitaria hasta quién se la llevó.
   */
  ejemplaresDeProducto: {
    etiqueta: 'Lotes en stock',
    singular: 'Lote',
    conVencimiento: true,
    conCantidad: true,
    ayuda: 'El mostrador ofrece primero el que antes vence, y esconde los vencidos.',
  },

  detalleDeLinea(linea: LineaTicket<AtributosFarmacia>): readonly DatoLinea[] {
    const datos: DatoLinea[] = []
    if (linea.atributos.lote) {
      datos.push({
        etiqueta: 'Lote',
        valor: linea.atributos.lote,
        tono: venceCerca(linea.atributos.vencimiento) ? 'aviso' : 'neutro',
      })
    }
    if (linea.atributos.vencimiento) {
      datos.push({
        etiqueta: 'Vence',
        valor: mesAnio(linea.atributos.vencimiento),
        tono: venceCerca(linea.atributos.vencimiento) ? 'aviso' : 'neutro',
      })
    }
    if (linea.atributos.numeroReceta) {
      datos.push({ etiqueta: 'Receta', valor: linea.atributos.numeroReceta })
    }
    return datos
  },

  /**
   * Solo lo que exige receta abre el paso extra.
   *
   * Un paracetamol se vende de un toque, como debe ser. Abrir un
   * formulario para cada producto por si acaso es la forma más rápida de
   * que el cajero deje de usar el sistema.
   */
  /* Se estampa en la línea para que la comprobación previa al cobro no
     tenga que volver al catálogo a preguntar qué era cada producto. */
  atributosIniciales(producto: ProductoRef): Record<string, unknown> {
    const iniciales: Record<string, unknown> = {}
    if (exigeReceta(producto)) iniciales['exigeReceta'] = true

    // El vencimiento del lote se copia a la línea: así `validarLinea`
    // puede comprobarlo sin volver al catálogo, y queda registrado qué se
    // entregó aunque el lote se agote después.
    const lotes = porVencimiento(ejemplaresDisponibles(producto))
    if (lotes.length > 0) iniciales['vencimientoLote'] = lotes[0].vence
    return iniciales
  },

  camposDeLinea(producto: ProductoRef): readonly CampoLinea[] {
    const campos: CampoLinea[] = []

    /*
     * El LOTE se elige de los que hay, ordenados por vencimiento.
     *
     * FEFO —primero el que antes caduca— no es una preferencia: es la
     * forma de no comerse el stock. Y los vencidos no aparecen, porque
     * venderlos es la infracción que cierra una botica. El primero de la
     * lista es siempre el que toca sacar.
     */
    const lotes = porVencimiento(ejemplaresDisponibles(producto))
    if (lotes.length > 0) {
      campos.push({
        clave: 'lote',
        etiqueta: 'Lote que se entrega',
        tipo: 'opcion',
        requerido: true,
        opciones: lotes.map((lote, indice) => ({
          valor: lote.codigo,
          etiqueta: `${lote.codigo} · vence ${mesAnio(lote.vence)}${
            indice === 0 ? ' · sacar este' : ''
          }`,
        })),
        ayuda: 'Sale primero el que antes vence. Comprueba que coincide con la caja.',
      })
    }

    if (exigeReceta(producto)) {
      campos.push({
        clave: 'numeroReceta',
        etiqueta: 'Número de receta',
        tipo: 'texto',
        requerido: true,
        modo: 'numerico',
        ayuda: 'El número impreso en la receta médica.',
      })
    }

    return campos
  },

  marcasDeProducto(producto: ProductoRef): readonly MarcaProducto[] {
    const marcas: MarcaProducto[] = []
    if (exigeReceta(producto)) {
      marcas.push({
        texto: 'receta',
        tono: 'aviso',
        detalle: 'Este producto se entrega solo con receta médica.',
      })
    }
    return marcas
  },

  /** La nota ya lleva «· exige receta»; la marca lo dice mejor. */
  limpiarNota(nota: string): string {
    return nota.replace(' · exige receta', '')
  },

  async validarLinea(linea: LineaTicket<AtributosFarmacia>): Promise<Validacion> {
    const vence = linea.atributos.vencimiento
    if (vence && new Date(vence) < new Date()) {
      return validacionFalla(`El lote ${linea.atributos.lote ?? ''} está vencido.`.trim())
    }
    return validacionOk
  },

  /**
   * Red de seguridad antes de cobrar.
   *
   * El número ya se pide al agregar, así que esto no debería saltar nunca
   * por el camino normal. Está por los que NO pasan por ahí: un ticket
   * aparcado y retomado, o uno que entre por el escáner. Una línea de
   * receta sin número es una infracción, y descubrirla en la inspección
   * sale más caro que pararla aquí.
   */
  async validarAntesDeCobrar(ticket: Ticket): Promise<Validacion> {
    const sinNumero = ticket.lineas.filter((linea) => {
      const atributos = linea.atributos as AtributosFarmacia
      return atributos['exigeReceta'] === true && !atributos.numeroReceta
    })
    if (sinNumero.length === 0) return validacionOk

    return validacionFalla(
      sinNumero.length === 1
        ? `Falta el número de receta de ${sinNumero[0].descripcion}.`
        : `Faltan los números de receta de ${sinNumero.length} productos.`,
    )
  },
}
