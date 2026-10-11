import {
  IGV_GENERAL,
  type EjeVariante,
  type ProductoRef,
  type VarianteProducto,
} from '@pos-core/index'

/**
 * Catálogo de una tienda de ropa.
 *
 * Existe para probar lo que farmacia no probaba: un producto que se abre
 * en VARIANTES. Una camisa es un producto con dos ejes —talla y color— y
 * hasta veinte combinaciones, cada una con su stock, todas al mismo
 * precio. Nada de eso cabe en «presentaciones», que son formas distintas
 * de vender lo mismo a precios distintos.
 *
 * Los huecos son a propósito: faltan tallas y colores en casi todos los
 * productos, porque una tienda real nunca tiene la matriz completa y la
 * pantalla tiene que enseñar el hueco, no esconderlo.
 */

const UND = { codigo: 'UND', nombre: 'Unidad', abreviatura: 'und' }

const TALLAS_LETRA = ['XS', 'S', 'M', 'L', 'XL']
const TALLAS_PANTALON = ['28', '30', '32', '34', '36']

function ejes(talla: readonly string[], colores: readonly string[]): readonly EjeVariante[] {
  return [
    { clave: 'talla', etiqueta: 'Talla', valores: talla },
    { clave: 'color', etiqueta: 'Color', valores: colores },
  ]
}

/**
 * Teje la matriz con los huecos que se le indiquen.
 *
 * `faltan` son las combinaciones que la tienda NO tiene en absoluto, y
 * `agotadas` las que tiene en cero. No es lo mismo: una no se repone y la
 * otra sí, y el vendedor contesta distinto al cliente.
 */
function matriz(
  prefijo: string,
  tallas: readonly string[],
  colores: readonly string[],
  opciones: { faltan?: string[]; agotadas?: string[]; stockBase?: number } = {},
): readonly VarianteProducto[] {
  const { faltan = [], agotadas = [], stockBase = 6 } = opciones
  const variantes: VarianteProducto[] = []
  for (const color of colores) {
    for (const talla of tallas) {
      const clave = `${talla}/${color}`
      if (faltan.includes(clave)) continue
      variantes.push({
        id: `${prefijo}-${talla}-${color}`.toLowerCase().replace(/\s+/g, ''),
        atributos: { talla, color },
        stock: agotadas.includes(clave) ? 0 : stockBase + ((talla.length + color.length) % 5),
      })
    }
  }
  return variantes
}

const productos: ProductoRef[] = [
  {
    id: 'r-camisa-oxford',
    categoria: { codigo: 'CAMIS', nombre: 'Camisas' },
    icono: 'prenda',
    descripcion: 'Camisa Oxford manga larga',
    codigoBarras: '7751000100018',
    unidadAlmacen: UND,
    presentaciones: [
      { id: 'r1-und', unidad: UND, factorAlmacen: 1, precio: 119, igvTasa: IGV_GENERAL },
    ],
    ejes: ejes(TALLAS_LETRA, ['Blanco', 'Celeste', 'Azul']),
    variantes: matriz('r1', TALLAS_LETRA, ['Blanco', 'Celeste', 'Azul'], {
      faltan: ['XS/Azul', 'XL/Celeste'],
      agotadas: ['S/Blanco', 'M/Azul'],
    }),
    ficha: [
      { etiqueta: 'Composición', valor: '100 % algodón', destacado: true },
      { etiqueta: 'Corte', valor: 'Regular fit', destacado: true },
      { etiqueta: 'Cuidados', valor: 'Lavar a 30 °C. No usar lejía.' },
      { etiqueta: 'Origen', valor: 'Perú' },
    ],
  },
  {
    id: 'r-polo-pique',
    categoria: { codigo: 'POLOS', nombre: 'Polos' },
    icono: 'prenda',
    descripcion: 'Polo piqué cuello camisero',
    codigoBarras: '7751000100025',
    unidadAlmacen: UND,
    presentaciones: [
      { id: 'r2-und', unidad: UND, factorAlmacen: 1, precio: 69, igvTasa: IGV_GENERAL },
    ],
    ejes: ejes(TALLAS_LETRA, ['Negro', 'Blanco', 'Vino']),
    variantes: matriz('r2', TALLAS_LETRA, ['Negro', 'Blanco', 'Vino'], {
      agotadas: ['XS/Vino'],
      stockBase: 9,
    }),
    ficha: [
      { etiqueta: 'Composición', valor: '95 % algodón, 5 % elastano', destacado: true },
      { etiqueta: 'Corte', valor: 'Slim fit', destacado: true },
      { etiqueta: 'Cuidados', valor: 'Lavar del revés.' },
    ],
  },
  {
    id: 'r-jean-recto',
    categoria: { codigo: 'PANTA', nombre: 'Pantalones' },
    icono: 'prenda',
    descripcion: 'Jean corte recto',
    codigoBarras: '7751000100032',
    unidadAlmacen: UND,
    presentaciones: [
      { id: 'r3-und', unidad: UND, factorAlmacen: 1, precio: 159, igvTasa: IGV_GENERAL },
    ],
    ejes: ejes(TALLAS_PANTALON, ['Índigo', 'Negro']),
    variantes: matriz('r3', TALLAS_PANTALON, ['Índigo', 'Negro'], {
      faltan: ['36/Negro'],
      agotadas: ['28/Índigo', '30/Negro'],
      stockBase: 4,
    }),
    ficha: [
      { etiqueta: 'Composición', valor: '98 % algodón, 2 % elastano', destacado: true },
      { etiqueta: 'Corte', valor: 'Recto', destacado: true },
      { etiqueta: 'Tiro', valor: 'Medio' },
    ],
  },
  {
    id: 'r-casaca-cortaviento',
    categoria: { codigo: 'ABRIG', nombre: 'Abrigos' },
    icono: 'prenda',
    descripcion: 'Casaca cortaviento impermeable',
    codigoBarras: '7751000100049',
    unidadAlmacen: UND,
    presentaciones: [
      { id: 'r4-und', unidad: UND, factorAlmacen: 1, precio: 249, igvTasa: IGV_GENERAL },
    ],
    ejes: ejes(['S', 'M', 'L'], ['Verde', 'Negro']),
    variantes: matriz('r4', ['S', 'M', 'L'], ['Verde', 'Negro'], { stockBase: 2 }),
    ficha: [
      { etiqueta: 'Composición', valor: 'Poliéster con membrana', destacado: true },
      { etiqueta: 'Impermeabilidad', valor: '3000 mm', destacado: true },
      { etiqueta: 'Cuidados', valor: 'No planchar. No secadora.' },
    ],
  },
  {
    /* Sin ejes: un cinturón de talla única. Prueba que la pantalla de
       ropa aguanta un producto que NO se abre en matriz. */
    id: 'r-correa-cuero',
    categoria: { codigo: 'ACCES', nombre: 'Accesorios' },
    icono: 'prenda',
    descripcion: 'Correa de cuero talla única',
    codigoBarras: '7751000100056',
    unidadAlmacen: UND,
    presentaciones: [
      { id: 'r5-und', unidad: UND, factorAlmacen: 1, precio: 89, igvTasa: IGV_GENERAL },
    ],
    stock: 12,
    ficha: [
      { etiqueta: 'Composición', valor: 'Cuero vacuno', destacado: true },
      { etiqueta: 'Ancho', valor: '3,5 cm' },
    ],
  },
  {
    id: 'r-medias-pack',
    categoria: { codigo: 'ACCES', nombre: 'Accesorios' },
    icono: 'prenda',
    descripcion: 'Pack 3 pares de medias',
    codigoBarras: '7751000100063',
    unidadAlmacen: UND,
    presentaciones: [
      { id: 'r6-und', unidad: UND, factorAlmacen: 1, precio: 39, igvTasa: IGV_GENERAL },
    ],
    ejes: [{ clave: 'talla', etiqueta: 'Talla', valores: ['35-38', '39-42', '43-46'] }],
    variantes: [
      { id: 'r6-35', atributos: { talla: '35-38' }, stock: 14 },
      { id: 'r6-39', atributos: { talla: '39-42' }, stock: 21 },
      { id: 'r6-43', atributos: { talla: '43-46' }, stock: 0 },
    ],
    ficha: [{ etiqueta: 'Composición', valor: 'Algodón peinado', destacado: true }],
  },
]

/** Existencias totales: la suma de las variantes, o el propio stock. */
function stockTotal(producto: ProductoRef): number | undefined {
  if (!producto.variantes) return producto.stock
  return producto.variantes.reduce((suma, variante) => suma + (variante.stock ?? 0), 0)
}

/** La línea de contexto: lo que distingue una prenda de otra de un vistazo. */
function nota(producto: ProductoRef): string {
  const composicion = producto.ficha?.find((campo) => campo.etiqueta === 'Composición')?.valor
  const corte = producto.ficha?.find((campo) => campo.etiqueta === 'Corte')?.valor
  return [composicion, corte].filter(Boolean).join(' · ')
}

export function catalogoRopa(): ProductoRef[] {
  return productos.map((producto) => ({
    ...producto,
    nota: nota(producto),
    stock: stockTotal(producto),
  }))
}
