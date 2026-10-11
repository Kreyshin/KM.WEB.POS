import type { LineaTicket, MarcaProducto, ProductoRef, Ticket, Validacion } from '@pos-core/index'
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

/** Atributos que esta vertical cuelga de una línea. */
export interface AtributosFarmacia extends Record<string, unknown> {
  lote?: string
  vencimiento?: string
  recetaId?: string
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
    if (linea.atributos.lote) partes.push(`lote ${linea.atributos.lote}`)
    return partes.join(' · ')
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
   * Antes de cobrar: ninguna línea con receta puede ir sin registrarla.
   *
   * De momento solo comprueba que exista un identificador. El ALCANCE de
   * la receta —si basta el número, o hacen falta médico, colegiatura y
   * paciente, o el libro de controlados completo— está sin decidir, y
   * ampliarlo es cambiar `AtributosFarmacia` y esta función. Nada más.
   */
  async validarAntesDeCobrar(ticket: Ticket): Promise<Validacion> {
    const sinReceta = ticket.lineas.filter((linea) => {
      const atributos = linea.atributos as AtributosFarmacia
      return atributos.recetaId === undefined && atributos.lote !== undefined
    })
    if (sinReceta.length > 0) {
      return validacionFalla(
        `Falta registrar la receta de ${sinReceta.length} ${
          sinReceta.length === 1 ? 'producto' : 'productos'
        }.`,
      )
    }
    return validacionOk
  },
}
