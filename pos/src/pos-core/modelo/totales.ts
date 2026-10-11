import type { LineaTicket, Totales } from './ticket'

/**
 * Cálculo de totales.
 *
 * Funciones puras, sin estado ni framework: son las que deciden cuánto paga
 * el cliente, así que son también las que más barato sale probar y las que
 * más caro sale equivocar.
 *
 * Todo el dinero se redondea a dos decimales en CADA paso, no solo al final.
 * No es manía: si se arrastran decimales y se redondea al cobrar, el total
 * no coincide con la suma de las líneas impresas en el comprobante, y el
 * cliente que suma a mano tiene razón.
 */

/** Redondeo a céntimos, estable para los valores de una venta de mostrador. */
export function aCentimos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/** Importe de una línea a precio de etiqueta, antes de su descuento. */
export function brutoLinea(linea: LineaTicket): number {
  return aCentimos(linea.cantidad * linea.precioUnitario)
}

/** Lo que se cobra por la línea, ya con su descuento aplicado. */
export function totalLinea(linea: LineaTicket): number {
  return aCentimos(Math.max(0, brutoLinea(linea) - linea.descuento))
}

/**
 * IGV contenido en un importe que ya lo incluye.
 *
 * Con precio con IGV incluido no se multiplica por la tasa, se despeja:
 * de 11.80 con 18 % el impuesto son 1.80, no 2.12.
 */
export function igvContenido(importe: number, tasa: number): number {
  if (tasa <= 0) return 0
  return aCentimos(importe - importe / (1 + tasa))
}

/**
 * Totales del ticket.
 *
 * El descuento de ticket se reparte entre las líneas en proporción a su
 * importe, y no se resta al final en bloque. Hace falta porque cada línea
 * puede tener una tasa de IGV distinta: si el descuento no se reparte, un
 * descuento global sobre un ticket con un medicamento exonerado y otro
 * gravado desglosa mal el impuesto, y la boleta sale incorrecta.
 */
export function calcularTotales(lineas: readonly LineaTicket[], descuentoTicket = 0): Totales {
  const bruto = aCentimos(lineas.reduce((suma, linea) => suma + brutoLinea(linea), 0))
  /*
   * El descuento de una línea no puede pasar de lo que cuesta esa línea.
   *
   * `totalLinea` ya lo tope­aba a cero, pero esta suma no, así que un
   * descuento excesivo inflaba el total descontado y podía dejar
   * `trasLineas` en negativo y el total por los suelos. Antes no se
   * alcanzaba porque nadie podía escribir un descuento de línea; desde que
   * el carrito lo permite, sí: basta descontar cinco soles y luego bajar la
   * cantidad a una tableta.
   */
  const descuentoLineas = aCentimos(
    lineas.reduce(
      (suma, linea) => suma + Math.min(Math.max(0, linea.descuento), brutoLinea(linea)),
      0,
    ),
  )

  const trasLineas = aCentimos(bruto - descuentoLineas)
  // Un descuento de ticket mayor que lo que queda dejaría un total negativo.
  const descuentoGlobal = aCentimos(Math.min(Math.max(0, descuentoTicket), trasLineas))
  const total = aCentimos(trasLineas - descuentoGlobal)

  let igv = 0
  if (trasLineas > 0) {
    for (const linea of lineas) {
      const neto = totalLinea(linea)
      const parte = aCentimos(neto - (descuentoGlobal * neto) / trasLineas)
      igv = aCentimos(igv + igvContenido(parte, linea.igvTasa))
    }
  }

  return {
    bruto,
    descuento: aCentimos(descuentoLineas + descuentoGlobal),
    valorVenta: aCentimos(total - igv),
    igv,
    total,
  }
}
