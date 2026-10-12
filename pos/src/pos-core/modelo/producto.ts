/**
 * Reglas sobre un producto del catálogo.
 *
 * Están aquí y no en la pantalla porque son decisiones del negocio, no de
 * presentación, y porque las usa más de una capa: la misma regla que pinta
 * la insignia «por reponer» en la tabla es la que cuenta la faceta de
 * stock en el adaptador. Mientras vivieron sueltas, el número 20 estaba
 * escrito a mano en cinco sitios de tres capas distintas, y cambiar el
 * punto de reposición significaba cazarlo por todo el repositorio con la
 * garantía de olvidarse uno.
 */
import type { EjemplarProducto, ProductoRef, VarianteProducto } from './catalogo'

/**
 * A partir de cuántas unidades un producto deja de estar «por reponer».
 *
 * Un solo número y en el núcleo. No es definitivo —el punto de reposición
 * de verdad depende de cuánto se vende y de lo que tarda el proveedor, y
 * eso lo traerá el ERP— pero mientras no exista, que al menos sea uno.
 */
export const PUNTO_REPOSICION = 20

/**
 * Cuándo se avisa de que quedan las últimas.
 *
 * Distinto del punto de reposición y a propósito: reponer es una decisión
 * del almacén y se toma con calma, mientras que «quedan dos» es lo que el
 * vendedor le dice al cliente que está dudando. Mismo dato, dos umbrales,
 * dos conversaciones.
 */
export const ULTIMAS_UNIDADES = 2

/** Si quedan tan pocas que merece decirlo en voz alta. */
export function quedanLasUltimas(stock: number | undefined): boolean {
  return stock !== undefined && stock > 0 && stock <= ULTIMAS_UNIDADES
}

export type NivelStock = 'agotado' | 'bajo' | 'ok' | 'sincontrol'

/**
 * En qué estado están las existencias.
 *
 * `sincontrol` es un estado real, no un error: el POS se puede vender sin
 * módulo de almacén, y entonces el producto no tiene stock que mirar. Es
 * distinto de tener cero, y confundirlos haría que un catálogo sin
 * inventario apareciera entero agotado.
 */
export function nivelDeStock(stock: number | undefined): NivelStock {
  if (stock === undefined) return 'sincontrol'
  if (stock <= 0) return 'agotado'
  return stock <= PUNTO_REPOSICION ? 'bajo' : 'ok'
}

/**
 * Las combinaciones que salen de los valores marcados en cada eje.
 *
 * El producto cartesiano, conservando lo que ya se había tecleado en cada
 * combinación que sigue existiendo. Eso último es la regla que importa:
 * desmarcar «XL» por error y volver a marcarlo no puede borrar el stock
 * que alguien acababa de contar en las demás tallas.
 *
 * Una combinación se identifica por sus valores en orden de eje, no por un
 * identificador inventado: es lo que permite reconocerla después de que el
 * usuario haya movido los ejes de sitio.
 */
export function combinacionesDe(
  ejes: readonly { clave: string }[],
  elegidos: Readonly<Record<string, readonly string[]>>,
  previas: readonly VarianteProducto[] = [],
): readonly VarianteProducto[] {
  const conValores = ejes.filter((eje) => (elegidos[eje.clave] ?? []).length > 0)
  if (conValores.length === 0) return []

  let filas: Record<string, string>[] = [{}]
  for (const eje of conValores) {
    const valores = elegidos[eje.clave] ?? []
    filas = filas.flatMap((fila) => valores.map((valor) => ({ ...fila, [eje.clave]: valor })))
  }

  const porClave = new Map(previas.map((v) => [claveDeVariante(ejes, v.atributos), v]))
  return filas.map((atributos) => {
    const clave = claveDeVariante(ejes, atributos)
    const previa = porClave.get(clave)
    return { id: previa?.id ?? clave, atributos, stock: previa?.stock, precio: previa?.precio }
  })
}

export function claveDeVariante(
  ejes: readonly { clave: string }[],
  atributos: Readonly<Record<string, string>>,
): string {
  return ejes.map((eje) => atributos[eje.clave] ?? '').join('|')
}

/**
 * Lo que impide guardar un producto, en una frase.
 *
 * UNA y no una lista: en un formulario corto, enseñar cinco errores a la
 * vez hace que no se lea ninguno. Se corrige el primero y aparece el
 * siguiente, que es como se rellena un formulario de verdad.
 *
 * El orden es el del formulario, no el de gravedad: mandar al usuario al
 * final de la pantalla y luego de vuelta al principio es peor que
 * pedírselo en orden.
 */
export function problemaDelProducto(
  borrador: Pick<ProductoRef, 'descripcion' | 'presentaciones' | 'ficha' | 'ejemplares'>,
  nombreEjemplar = 'ejemplar',
): string | null {
  if (borrador.descripcion.trim().length < 3) return 'Falta la descripción.'

  const presentaciones = borrador.presentaciones
  if (presentaciones.length === 0) return 'Añade al menos una forma de venta.'
  if (presentaciones.some((pres) => pres.precio <= 0)) {
    return 'Toda forma de venta necesita un precio mayor que cero.'
  }
  if (presentaciones.some((pres) => pres.factorAlmacen <= 0)) {
    return 'La equivalencia con el almacén tiene que ser mayor que cero.'
  }

  if ((borrador.ficha ?? []).some((campo) => campo.etiqueta.trim() && !campo.valor.trim())) {
    return 'Hay un dato de la ficha con etiqueta y sin valor.'
  }

  const repetido = primerCodigoRepetido(borrador.ejemplares ?? [])
  if (repetido) {
    return `El ${nombreEjemplar.toLowerCase()} ${repetido} está dos veces: son uno contado dos veces.`
  }
  return null
}

/** El primer código que aparece más de una vez, o null. */
export function primerCodigoRepetido(ejemplares: readonly EjemplarProducto[]): string | null {
  const vistos = new Set<string>()
  for (const ejemplar of ejemplares) {
    const codigo = ejemplar.codigo.trim()
    if (!codigo) continue
    if (vistos.has(codigo)) return codigo
    vistos.add(codigo)
  }
  return null
}
