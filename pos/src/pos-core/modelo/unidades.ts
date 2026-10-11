/**
 * Unidades de medida y presentaciones de venta.
 *
 * Un producto se compra, se guarda y se vende en unidades distintas: una
 * botica compra una caja de 100 blísteres, la guarda por blíster y vende la
 * tableta suelta. Lo mismo pasa en una ferretería (rollo y metro) y en una
 * bodega (caja y unidad); la ropa, donde las tres coinciden, es la excepción.
 *
 * Por eso la unidad vive en el NÚCLEO y no en `atributos`. `atributos` es
 * para lo que el núcleo debe guardar sin entender; la unidad tiene que
 * entenderla, porque de ella dependen el total que se cobra y las unidades
 * que se descuentan del stock.
 *
 * Este repo solo necesita dos de las tres unidades:
 *   - la de VENTA, que es en la que se cobra
 *   - la de ALMACÉN, que es en la que se descuenta
 * La de COMPRA es asunto del módulo de almacén del ERP, que es quien recibe
 * la mercadería; el mostrador no la usa nunca.
 */

export interface UnidadMedida {
  /** Código corto, el mismo que usará el ERP al enlazar: 'UND', 'TAB', 'CAJ'. */
  codigo: string
  nombre: string
  abreviatura: string
}

/**
 * Una forma de vender un producto, con su precio.
 *
 * El mismo paracetamol puede venderse como tableta, como blíster de 10 o como
 * caja de 100, cada una a su precio y consumiendo distinto stock.
 */
export interface PresentacionVenta {
  id: string
  unidad: UnidadMedida
  /**
   * Unidades de ALMACÉN que consume una unidad de venta.
   *
   * Si el almacén cuenta tabletas: vender un blíster de 10 descuenta 10. Si
   * cuenta blísteres, vender una tableta descuenta 0.1. El número puede no
   * ser entero, y por eso no se redondea aquí: redondear el consumo de stock
   * es inventar o perder mercadería.
   */
  factorAlmacen: number
  /** Precio al público de una unidad de venta, CON el IGV ya incluido. */
  precio: number
  /**
   * Tasa de IGV contenida en el precio: 0.18 lo normal, 0 lo exonerado.
   *
   * No es un detalle de farmacia aunque ahí se note más: ciertos
   * medicamentos —oncológicos, diabetes, VIH— están exonerados, y una boleta
   * que los grave está mal emitida.
   */
  igvTasa: number
  /**
   * La presentación se obtiene rompiendo otra mayor.
   *
   * La tableta suelta de un blíster que se vende cerrado: existe para el
   * cliente que pide una sola y no para el inventario, que sigue contando
   * la unidad de almacén. Es solo una etiqueta para la pantalla —el cálculo
   * ya sale de `factorAlmacen`—, pero sin ella el cajero no distingue entre
   * vender un envase y partirlo, que es una decisión del mostrador.
   */
  fraccionada?: boolean
}

/** IGV general vigente en Perú. Las presentaciones exoneradas llevan 0. */
export const IGV_GENERAL = 0.18
