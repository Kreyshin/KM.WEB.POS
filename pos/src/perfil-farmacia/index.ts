import type {
  CampoLinea,
  LineaTicket,
  MarcaProducto,
  ProductoRef,
  Ticket,
  Validacion,
} from '@pos-core/index'
import { validacionFalla, validacionOk } from '@pos-core/index'
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
function exigeReceta(producto: ProductoRef): boolean {
  return (
    producto.ficha?.some(
      (campo) => campo.etiqueta === 'Condición de venta' && campo.valor === 'Con receta',
    ) === true || producto.nota?.includes('exige receta') === true
  )
}

export const perfilFarmacia: PerfilRubroAngular<AtributosFarmacia> = {
  codigo: 'farmacia',
  nombre: 'Farmacia',

  describirLinea(linea: LineaTicket<AtributosFarmacia>): string {
    const partes = [linea.descripcion, linea.unidad.nombre]
    if (linea.atributos.numeroReceta) partes.push(`receta ${linea.atributos.numeroReceta}`)
    if (linea.atributos.lote) partes.push(`lote ${linea.atributos.lote}`)
    return partes.join(' · ')
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
    return exigeReceta(producto) ? { exigeReceta: true } : {}
  },

  camposDeLinea(producto: ProductoRef): readonly CampoLinea[] {
    if (!exigeReceta(producto)) return []
    return [
      {
        clave: 'numeroReceta',
        etiqueta: 'Número de receta',
        tipo: 'texto',
        requerido: true,
        modo: 'numerico',
        ayuda: 'El número impreso en la receta médica.',
      },
    ]
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
