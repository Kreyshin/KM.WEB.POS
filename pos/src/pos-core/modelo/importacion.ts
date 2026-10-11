import type { CampoFicha, ProductoRef } from './catalogo'
import { IGV_GENERAL, type PresentacionVenta, type UnidadMedida } from './unidades'

/**
 * Carga masiva de catálogo.
 *
 * Al instalar en una botica real no se dan de alta 500 productos a mano:
 * se traen de una hoja. Esta es la parte que de verdad importa y la única
 * que se puede probar sin un archivo: convertir filas sueltas en productos
 * y, sobre todo, DECIR QUÉ ESTÁ MAL y en qué fila.
 *
 * Nada de Excel vive aquí. Llegan filas ya leídas, como pares
 * columna/valor, y salen productos y errores. Quien lea el .xlsx es cosa
 * del adaptador, y así el día que la carga venga de un CSV o de un pegado
 * desde el portapapeles, esto no cambia.
 *
 * UNA FILA POR FORMA DE VENTA, agrupadas por `codigo`. Es lo que permite
 * que un producto tenga tres presentaciones sin inventar columnas
 * `precio_1`, `precio_2`, `precio_3`, que es donde acaban todas las
 * plantillas que empiezan con una fila por producto.
 */

/** Una fila leída de la hoja: encabezado normalizado → valor en texto. */
export type FilaHoja = Readonly<Record<string, string>>

export interface ErrorImportacion {
  /** Número de fila en la hoja, contando el encabezado. Es lo que ve el usuario. */
  fila: number
  columna?: string
  mensaje: string
}

export interface ResultadoImportacion {
  productos: ProductoRef[]
  errores: ErrorImportacion[]
}

export interface ColumnaPlantilla {
  clave: string
  titulo: string
  obligatoria: boolean
  ayuda: string
  ejemplo: string
}

/**
 * Las columnas de la plantilla.
 *
 * Se declaran aquí, en el núcleo, y no en el generador del Excel: la hoja
 * que se descarga y el analizador que la lee tienen que estar de acuerdo
 * siempre, y la única forma de garantizarlo es que salgan de la misma
 * lista.
 */
export const columnasPlantilla: readonly ColumnaPlantilla[] = [
  {
    clave: 'codigo',
    titulo: 'codigo',
    obligatoria: true,
    ayuda: 'Agrupa las filas del mismo producto. Repítelo en cada forma de venta.',
    ejemplo: 'PAR500',
  },
  {
    clave: 'descripcion',
    titulo: 'descripcion',
    obligatoria: true,
    ayuda: 'Nombre completo, como se busca en el mostrador.',
    ejemplo: 'Paracetamol 500 mg',
  },
  {
    clave: 'codigo_barras',
    titulo: 'codigo_barras',
    obligatoria: false,
    ayuda: 'El que lee el escáner. Opcional, pero sin él no hay venta por lectura.',
    ejemplo: '7750001000017',
  },
  {
    clave: 'categoria',
    titulo: 'categoria',
    obligatoria: false,
    ayuda: 'Para agrupar y filtrar en el mostrador.',
    ejemplo: 'Analgésicos',
  },
  {
    clave: 'icono',
    titulo: 'icono',
    obligatoria: false,
    ayuda: 'tableta, capsula, frasco, inyectable, caja, prenda o generico.',
    ejemplo: 'tableta',
  },
  {
    clave: 'unidad_almacen',
    titulo: 'unidad_almacen',
    obligatoria: true,
    ayuda: 'En la que cuenta el inventario. Igual en todas las filas del producto.',
    ejemplo: 'TAB',
  },
  {
    clave: 'stock',
    titulo: 'stock',
    obligatoria: false,
    ayuda: 'Existencias en unidad de almacén. Se lee de la primera fila del producto.',
    ejemplo: '420',
  },
  {
    clave: 'venta_unidad',
    titulo: 'venta_unidad',
    obligatoria: true,
    ayuda: 'La unidad de ESTA forma de venta: TAB, BLI, CAJ, UND…',
    ejemplo: 'BLI',
  },
  {
    clave: 'equivale_a',
    titulo: 'equivale_a',
    obligatoria: true,
    ayuda: 'Cuántas unidades de almacén consume vender una. Un blíster de 10 tabletas: 10.',
    ejemplo: '10',
  },
  {
    clave: 'precio',
    titulo: 'precio',
    obligatoria: true,
    ayuda: 'Precio al público CON IGV incluido, que es el de la etiqueta.',
    ejemplo: '4.50',
  },
  {
    clave: 'exonerado',
    titulo: 'exonerado',
    obligatoria: false,
    ayuda: 'si / no. Solo para lo exonerado de IGV, como el tratamiento de diabetes.',
    ejemplo: 'no',
  },
  {
    clave: 'suelta',
    titulo: 'suelta',
    obligatoria: false,
    ayuda: 'si / no. Marca la forma que sale de romper un envase mayor.',
    ejemplo: 'no',
  },
  {
    clave: 'ficha',
    titulo: 'ficha',
    obligatoria: false,
    ayuda: 'Datos del producto: Etiqueta: valor, separados por |.',
    ejemplo: 'Principio activo: Paracetamol | Laboratorio: Genfar',
  },
]

/** Unidades reconocidas. Una no listada se acepta usando el propio código. */
const UNIDADES: Record<string, UnidadMedida> = {
  UND: { codigo: 'UND', nombre: 'Unidad', abreviatura: 'und' },
  TAB: { codigo: 'TAB', nombre: 'Tableta', abreviatura: 'tab' },
  BLI: { codigo: 'BLI', nombre: 'Blíster', abreviatura: 'bli' },
  CAJ: { codigo: 'CAJ', nombre: 'Caja', abreviatura: 'caj' },
  FCO: { codigo: 'FCO', nombre: 'Frasco', abreviatura: 'fco' },
  KGR: { codigo: 'KGR', nombre: 'Kilogramo', abreviatura: 'kg' },
  LTR: { codigo: 'LTR', nombre: 'Litro', abreviatura: 'L' },
}

const ICONOS = ['tableta', 'capsula', 'frasco', 'inyectable', 'caja', 'prenda', 'generico']

function unidadDe(codigo: string): UnidadMedida {
  const limpio = codigo.trim().toUpperCase()
  return UNIDADES[limpio] ?? { codigo: limpio, nombre: limpio, abreviatura: limpio.toLowerCase() }
}

/**
 * Interpreta un número escrito por una persona en una hoja.
 *
 * Acepta la coma decimal, que es lo que teclea media Latinoamérica, y los
 * separadores de millar que Excel mete solo. Rechazar «4,50» sería
 * rechazar la mitad de las plantillas que lleguen.
 */
export function numeroDeHoja(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, '')
  if (!limpio) return null

  // Con coma y punto manda el último: en «1.234,50» la coma es decimal y
  // en «1,234.50» lo es el punto.
  let normalizado = limpio
  const ultimaComa = limpio.lastIndexOf(',')
  const ultimoPunto = limpio.lastIndexOf('.')
  if (ultimaComa > -1 && ultimoPunto > -1) {
    normalizado =
      ultimaComa > ultimoPunto
        ? limpio.replace(/\./g, '').replace(',', '.')
        : limpio.replace(/,/g, '')
  } else if (ultimaComa > -1) {
    normalizado = limpio.replace(',', '.')
  }

  const valor = Number(normalizado)
  return Number.isFinite(valor) ? valor : null
}

/** «si», «sí», «x», «1», «true», «verdadero». Lo que la gente escribe. */
export function siONo(texto: string): boolean {
  const limpio = texto.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return ['si', 'x', '1', 'true', 'verdadero', 'y', 'yes'].includes(limpio)
}

/** «Etiqueta: valor | Otra: valor» → campos de ficha. */
export function fichaDeTexto(texto: string): CampoFicha[] {
  return texto
    .split('|')
    .map((trozo) => trozo.trim())
    .filter(Boolean)
    .map((trozo) => {
      const corte = trozo.indexOf(':')
      if (corte === -1) return { etiqueta: 'Nota', valor: trozo }
      return {
        etiqueta: trozo.slice(0, corte).trim(),
        valor: trozo.slice(corte + 1).trim(),
      }
    })
    .filter((campo) => campo.etiqueta && campo.valor)
}

/**
 * Convierte filas en productos, diciendo qué está mal y dónde.
 *
 * Una fila con error NO invalida la carga entera: se descarta esa fila y
 * el resto sigue. Con 500 productos, abortar todo por un precio mal
 * escrito obligaría a repetir el ciclo entero por cada errata, y nadie
 * revisa una hoja de 500 filas a la primera.
 *
 * Pero si el error deja al producto sin ninguna forma de venta válida, el
 * producto entero se descarta: darlo de alta sin precio solo traslada el
 * problema al mostrador.
 */
export function analizarFilas(filas: readonly FilaHoja[]): ResultadoImportacion {
  const errores: ErrorImportacion[] = []
  const porCodigo = new Map<string, { producto: ProductoRef; filaPrimera: number }>()

  filas.forEach((fila, indice) => {
    // +2: la hoja empieza en 1 y la primera es el encabezado.
    const numeroFila = indice + 2
    const anota = (mensaje: string, columna?: string) =>
      errores.push({ fila: numeroFila, columna, mensaje })

    const valor = (clave: string) => (fila[clave] ?? '').trim()

    const codigo = valor('codigo')
    const descripcion = valor('descripcion')
    if (!codigo && !descripcion) return // Fila en blanco: se ignora en silencio.

    if (!codigo) {
      anota('Falta el código que agrupa las formas de venta.', 'codigo')
      return
    }

    const yaVisto = porCodigo.get(codigo)

    if (!yaVisto && !descripcion) {
      anota('La primera fila de un producto necesita descripción.', 'descripcion')
      return
    }

    const precio = numeroDeHoja(valor('precio'))
    if (precio === null) {
      anota('El precio no es un número.', 'precio')
      return
    }
    if (precio <= 0) {
      anota('El precio tiene que ser mayor que cero.', 'precio')
      return
    }

    const factorTexto = valor('equivale_a')
    const factor = factorTexto ? numeroDeHoja(factorTexto) : 1
    if (factor === null) {
      anota('La equivalencia con el almacén no es un número.', 'equivale_a')
      return
    }
    if (factor <= 0) {
      anota('La equivalencia con el almacén tiene que ser mayor que cero.', 'equivale_a')
      return
    }

    const codigoVenta = valor('venta_unidad') || valor('unidad_almacen')
    if (!codigoVenta) {
      anota('Falta la unidad de esta forma de venta.', 'venta_unidad')
      return
    }

    const presentacion: PresentacionVenta = {
      id: `${codigo}-${codigoVenta}`.toLowerCase(),
      unidad: unidadDe(codigoVenta),
      factorAlmacen: factor,
      precio,
      igvTasa: siONo(valor('exonerado')) ? 0 : IGV_GENERAL,
      ...(siONo(valor('suelta')) ? { fraccionada: true } : {}),
    }

    if (yaVisto) {
      // Repetir la misma unidad en dos filas es un copia y pega: la
      // segunda pisaría a la primera en silencio, y se prefiere avisar.
      if (yaVisto.producto.presentaciones.some((p) => p.id === presentacion.id)) {
        anota(`La forma de venta «${codigoVenta}» ya estaba en este producto.`, 'venta_unidad')
        return
      }
      yaVisto.producto.presentaciones.push(presentacion)
      return
    }

    const iconoTexto = valor('icono').toLowerCase()
    if (iconoTexto && !ICONOS.includes(iconoTexto)) {
      anota(`El icono «${iconoTexto}» no existe; se usará el genérico.`, 'icono')
    }

    const categoria = valor('categoria')
    const stock = valor('stock') ? numeroDeHoja(valor('stock')) : null
    if (valor('stock') && stock === null) {
      anota('Las existencias no son un número; se dejarán en cero.', 'stock')
    }

    const ficha = fichaDeTexto(valor('ficha'))

    porCodigo.set(codigo, {
      filaPrimera: numeroFila,
      producto: {
        id: codigo,
        descripcion,
        codigoBarras: valor('codigo_barras') || undefined,
        categoria: categoria
          ? { codigo: categoria.slice(0, 5).toUpperCase(), nombre: categoria }
          : undefined,
        icono: ICONOS.includes(iconoTexto) ? iconoTexto : 'generico',
        unidadAlmacen: unidadDe(valor('unidad_almacen') || codigoVenta),
        presentaciones: [presentacion],
        stock: stock === null ? 0 : Math.max(0, stock),
        ficha: ficha.length > 0 ? ficha : undefined,
      },
    })
  })

  const productos: ProductoRef[] = []
  for (const { producto, filaPrimera } of porCodigo.values()) {
    if (producto.presentaciones.length === 0) {
      errores.push({
        fila: filaPrimera,
        mensaje: `«${producto.descripcion}» se descarta: ninguna forma de venta es válida.`,
      })
      continue
    }
    productos.push(producto)
  }

  return { productos, errores }
}
