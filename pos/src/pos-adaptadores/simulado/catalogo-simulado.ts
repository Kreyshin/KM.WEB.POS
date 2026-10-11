import {
  IGV_GENERAL,
  type CampoFicha,
  type CategoriaRef,
  type ConsultaCatalogo,
  type Faceta,
  type OrdenCatalogo,
  type ProductoRef,
  type PuertoCatalogo,
} from '@pos-core/index'

/**
 * Catálogo en memoria.
 *
 * Datos de botica de verdad, no relleno: tres presentaciones del mismo
 * producto con factores distintos, un exonerado de IGV, y productos que solo
 * se venden por unidad. Son los casos que rompen un modelo mal hecho, así que
 * conviene que estén desde el primer día.
 */
const UND = { codigo: 'UND', nombre: 'Unidad', abreviatura: 'und' }
const TAB = { codigo: 'TAB', nombre: 'Tableta', abreviatura: 'tab' }
const BLI = { codigo: 'BLI', nombre: 'Blíster x10', abreviatura: 'bli' }
const CAJ = { codigo: 'CAJ', nombre: 'Caja x100', abreviatura: 'caj' }
const FCO = { codigo: 'FCO', nombre: 'Frasco', abreviatura: 'fco' }

/** Lo que el buscador del perfil puede leer, y el núcleo no interpreta. */
interface DetalleFarmacia extends Record<string, unknown> {
  principioActivo: string
  concentracion: string
  forma: string
  laboratorio: string
  registro: string
  exigeReceta: boolean
  /** Lo que el cajero contesta de memoria cuando el cliente pregunta. */
  indicacion: string
  advertencia?: string
}

const productos: ProductoRef[] = [
  {
    id: 'f-paracetamol-500',
    categoria: { codigo: 'ANALG', nombre: 'Analgésicos' },
    icono: 'tableta',
    descripcion: 'Paracetamol 500 mg',
    codigoBarras: '7750001000017',
    // El almacén cuenta tabletas, así que un blíster descuenta 10.
    unidadAlmacen: TAB,
    presentaciones: [
      {
        id: 'p1-tab',
        unidad: TAB,
        factorAlmacen: 1,
        precio: 0.5,
        igvTasa: IGV_GENERAL,
        fraccionada: true,
      },
      { id: 'p1-bli', unidad: BLI, factorAlmacen: 10, precio: 4.5, igvTasa: IGV_GENERAL },
      { id: 'p1-caj', unidad: CAJ, factorAlmacen: 100, precio: 40, igvTasa: IGV_GENERAL },
    ],
  },
  {
    id: 'f-ibuprofeno-400',
    categoria: { codigo: 'ANALG', nombre: 'Analgésicos' },
    icono: 'tableta',
    descripcion: 'Ibuprofeno 400 mg',
    codigoBarras: '7750001000024',
    unidadAlmacen: TAB,
    presentaciones: [
      {
        id: 'p2-tab',
        unidad: TAB,
        factorAlmacen: 1,
        precio: 0.8,
        igvTasa: IGV_GENERAL,
        fraccionada: true,
      },
      { id: 'p2-bli', unidad: BLI, factorAlmacen: 10, precio: 7, igvTasa: IGV_GENERAL },
    ],
  },
  {
    id: 'f-amoxicilina-500',
    categoria: { codigo: 'ANTIB', nombre: 'Antibióticos' },
    icono: 'capsula',
    descripcion: 'Amoxicilina 500 mg',
    codigoBarras: '7750001000031',
    unidadAlmacen: TAB,
    presentaciones: [
      { id: 'p3-bli', unidad: BLI, factorAlmacen: 10, precio: 12, igvTasa: IGV_GENERAL },
      // El blíster se vende cerrado, pero el cliente pide por día de
      // tratamiento. La cápsula suelta sale de romperlo, y por eso vale algo
      // más que la décima parte: la botica se queda el resto del envase.
      {
        id: 'p3-cap',
        unidad: TAB,
        factorAlmacen: 1,
        precio: 1.4,
        igvTasa: IGV_GENERAL,
        fraccionada: true,
      },
    ],
  },
  {
    id: 'f-metformina-850',
    categoria: { codigo: 'CRONI', nombre: 'Crónicos' },
    icono: 'tableta',
    descripcion: 'Metformina 850 mg',
    codigoBarras: '7750001000048',
    unidadAlmacen: TAB,
    // Exonerada de IGV: es tratamiento de diabetes. Una boleta que la grave
    // está mal emitida, y por eso la tasa vive en la presentación.
    presentaciones: [
      {
        id: 'p4-tab',
        unidad: TAB,
        factorAlmacen: 1,
        precio: 0.4,
        igvTasa: 0,
        fraccionada: true,
      },
      { id: 'p4-bli', unidad: BLI, factorAlmacen: 10, precio: 3.5, igvTasa: 0 },
    ],
  },
  {
    id: 'f-loratadina-10',
    categoria: { codigo: 'ALERG', nombre: 'Antialérgicos' },
    icono: 'tableta',
    descripcion: 'Loratadina 10 mg',
    codigoBarras: '7750001000055',
    unidadAlmacen: TAB,
    presentaciones: [
      {
        id: 'p5-tab',
        unidad: TAB,
        factorAlmacen: 1,
        precio: 0.6,
        igvTasa: IGV_GENERAL,
        fraccionada: true,
      },
      { id: 'p5-bli', unidad: BLI, factorAlmacen: 10, precio: 5.5, igvTasa: IGV_GENERAL },
    ],
  },
  {
    id: 'f-alcohol-70',
    categoria: { codigo: 'INSUM', nombre: 'Insumos' },
    icono: 'frasco',
    descripcion: 'Alcohol medicinal 70° 1 L',
    codigoBarras: '7750001000062',
    unidadAlmacen: FCO,
    presentaciones: [
      { id: 'p6-fco', unidad: FCO, factorAlmacen: 1, precio: 12.9, igvTasa: IGV_GENERAL },
    ],
  },
  {
    id: 'f-jeringa-5',
    categoria: { codigo: 'INSUM', nombre: 'Insumos' },
    icono: 'inyectable',
    descripcion: 'Jeringa descartable 5 ml',
    codigoBarras: '7750001000079',
    unidadAlmacen: UND,
    presentaciones: [
      { id: 'p7-und', unidad: UND, factorAlmacen: 1, precio: 1.2, igvTasa: IGV_GENERAL },
    ],
  },
  {
    id: 'f-mascarilla',
    categoria: { codigo: 'PROTE', nombre: 'Protección' },
    icono: 'caja',
    descripcion: 'Mascarilla quirúrgica tricapa',
    codigoBarras: '7750001000086',
    unidadAlmacen: UND,
    presentaciones: [
      { id: 'p8-und', unidad: UND, factorAlmacen: 1, precio: 0.7, igvTasa: IGV_GENERAL },
      { id: 'p8-caj', unidad: CAJ, factorAlmacen: 50, precio: 28, igvTasa: IGV_GENERAL },
    ],
  },
]

/** Lo que el perfil de farmacia sabe leer de cada producto. */
export const detalleFarmacia: Record<string, DetalleFarmacia> = {
  'f-paracetamol-500': {
    principioActivo: 'Paracetamol',
    concentracion: '500 mg',
    forma: 'Tableta recubierta',
    laboratorio: 'Genfar',
    registro: 'EE-01234',
    exigeReceta: false,
    indicacion: 'Fiebre y dolor leve a moderado.',
    advertencia: 'No pasar de 4 g al día. Evitar con alcohol.',
  },
  'f-ibuprofeno-400': {
    principioActivo: 'Ibuprofeno',
    concentracion: '400 mg',
    forma: 'Tableta recubierta',
    laboratorio: 'Portugal',
    registro: 'EE-02198',
    exigeReceta: false,
    indicacion: 'Dolor con inflamación: muscular, dental, menstrual.',
    advertencia: 'Tomar con alimentos. Cuidado con gastritis.',
  },
  'f-amoxicilina-500': {
    principioActivo: 'Amoxicilina',
    concentracion: '500 mg',
    forma: 'Cápsula',
    laboratorio: 'Medifarma',
    registro: 'EE-03455',
    exigeReceta: true,
    indicacion: 'Antibiótico de amplio espectro.',
    advertencia: 'Completar el tratamiento aunque mejore.',
  },
  'f-metformina-850': {
    principioActivo: 'Metformina',
    concentracion: '850 mg',
    forma: 'Tableta recubierta',
    laboratorio: 'Hersil',
    registro: 'EE-04112',
    exigeReceta: true,
    indicacion: 'Diabetes tipo 2.',
    advertencia: 'Exonerada de IGV por tratamiento crónico.',
  },
  'f-loratadina-10': {
    principioActivo: 'Loratadina',
    concentracion: '10 mg',
    forma: 'Tableta',
    laboratorio: 'Genfar',
    registro: 'EE-05007',
    exigeReceta: false,
    indicacion: 'Alergia, rinitis y urticaria.',
  },
  'f-alcohol-70': {
    principioActivo: 'Etanol 70°',
    concentracion: '1 L',
    forma: 'Solución tópica',
    laboratorio: 'Portugal',
    registro: 'EE-06330',
    exigeReceta: false,
    indicacion: 'Antiséptico de uso externo.',
    advertencia: 'Inflamable. No ingerir.',
  },
  'f-jeringa-5': {
    principioActivo: '—',
    concentracion: '5 ml',
    forma: 'Dispositivo estéril',
    laboratorio: 'Nipro',
    registro: 'DM-00891',
    exigeReceta: false,
    indicacion: 'Jeringa descartable con aguja 21G.',
  },
  'f-mascarilla': {
    principioActivo: '—',
    concentracion: 'Tricapa',
    forma: 'Dispositivo',
    laboratorio: 'Genérico',
    registro: 'DM-01204',
    exigeReceta: false,
    indicacion: 'Barrera de protección respiratoria.',
  },
}

/** Existencias en unidad de almacén. Stock simple, el del POS sin ERP. */
const existencias: Record<string, number> = {
  'f-paracetamol-500': 420,
  'f-ibuprofeno-400': 180,
  'f-amoxicilina-500': 60,
  'f-metformina-850': 240,
  'f-loratadina-10': 95,
  'f-alcohol-70': 14,
  'f-jeringa-5': 7,
  'f-mascarilla': 0,
}

/**
 * Compone la ficha que la pantalla enseña.
 *
 * Es el único sitio donde vive el vocabulario de farmacia: fuera de aquí
 * son pares etiqueta/valor que cualquier rubro podría llenar con los suyos.
 */
function fichaDe(producto: ProductoRef): readonly CampoFicha[] | undefined {
  const d = detalleFarmacia[producto.id]
  if (!d) return undefined
  const campos: CampoFicha[] = [
    { etiqueta: 'Principio activo', valor: d.principioActivo, destacado: true },
    { etiqueta: 'Concentración', valor: d.concentracion, destacado: true },
    { etiqueta: 'Forma', valor: d.forma },
    { etiqueta: 'Laboratorio', valor: d.laboratorio },
    { etiqueta: 'Registro sanitario', valor: d.registro },
    { etiqueta: 'Condición de venta', valor: d.exigeReceta ? 'Con receta' : 'Venta libre' },
    { etiqueta: 'Para qué se usa', valor: d.indicacion },
  ]
  if (d.advertencia) campos.push({ etiqueta: 'Advertencia', valor: d.advertencia })
  return campos
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

/** Compone la línea de contexto, la ficha y el stock que ve la pantalla. */
function enriquecer(producto: ProductoRef): ProductoRef {
  const detalle = detalleFarmacia[producto.id]
  if (!detalle) return producto
  const partes = [detalle.principioActivo, detalle.laboratorio]
  if (detalle.exigeReceta) partes.push('exige receta')
  return {
    ...producto,
    nota: partes.join(' · '),
    ficha: fichaDe(producto),
    stock: existencias[producto.id],
  }
}

/** Las categorías del catálogo, con cuántos productos tiene cada una. */
export function categoriasDelCatalogo(): { categoria: CategoriaRef; cuantos: number }[] {
  const cuenta = new Map<string, { categoria: CategoriaRef; cuantos: number }>()
  for (const producto of productos) {
    if (!producto.categoria) continue
    const previo = cuenta.get(producto.categoria.codigo)
    if (previo) previo.cuantos += 1
    else cuenta.set(producto.categoria.codigo, { categoria: producto.categoria, cuantos: 1 })
  }
  return [...cuenta.values()]
}

/**
 * Facetas del catálogo.
 *
 * Las publica el adaptador, no la pantalla: ella solo dibuja lo que reciba
 * con sus cuentas. Cambiar de rubro cambia estas facetas y la pantalla
 * sigue igual, que es la razón de que el filtro sea genérico.
 */
export function facetasDelCatalogo(): readonly Faceta[] {
  const contar = (de: (p: ProductoRef) => { valor: string; etiqueta: string } | null) => {
    const cuenta = new Map<string, OpcionFacetaMutable>()
    for (const producto of productos) {
      const clave = de(producto)
      if (!clave) continue
      const previo = cuenta.get(clave.valor)
      if (previo) previo.cuantos += 1
      else cuenta.set(clave.valor, { ...clave, cuantos: 1 })
    }
    return [...cuenta.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'))
  }

  return [
    {
      clave: 'categoria',
      etiqueta: 'Categoría',
      opciones: contar((p) =>
        p.categoria ? { valor: p.categoria.codigo, etiqueta: p.categoria.nombre } : null,
      ),
    },
    {
      clave: 'laboratorio',
      etiqueta: 'Laboratorio',
      opciones: contar((p) => {
        const lab = detalleFarmacia[p.id]?.laboratorio
        return lab ? { valor: lab, etiqueta: lab } : null
      }),
    },
    {
      clave: 'condicion',
      etiqueta: 'Condición de venta',
      opciones: contar((p) => {
        const d = detalleFarmacia[p.id]
        if (!d) return null
        return d.exigeReceta
          ? { valor: 'receta', etiqueta: 'Con receta' }
          : { valor: 'libre', etiqueta: 'Venta libre' }
      }),
    },
    {
      clave: 'afectacion',
      etiqueta: 'IGV',
      opciones: contar((p) =>
        p.presentaciones.some((v) => v.igvTasa === 0)
          ? { valor: 'exonerado', etiqueta: 'Exonerado' }
          : { valor: 'gravado', etiqueta: 'Gravado' },
      ),
    },
    {
      clave: 'fraccion',
      etiqueta: 'Fraccionamiento',
      opciones: contar((p) =>
        p.presentaciones.some((v) => v.fraccionada)
          ? { valor: 'si', etiqueta: 'Se vende suelto' }
          : { valor: 'no', etiqueta: 'Solo envase' },
      ),
    },
    {
      clave: 'disponibilidad',
      etiqueta: 'Stock',
      opciones: contar((p) => {
        const hay = existencias[p.id] ?? 0
        if (hay === 0) return { valor: 'agotado', etiqueta: 'Agotado' }
        if (hay <= 20) return { valor: 'bajo', etiqueta: 'Por reponer' }
        return { valor: 'ok', etiqueta: 'Disponible' }
      }),
    },
  ]
}

interface OpcionFacetaMutable {
  valor: string
  etiqueta: string
  cuantos: number
}

/** Decide si un producto pasa un filtro de faceta. */
function cumple(producto: ProductoRef, clave: string, valor: string): boolean {
  const d = detalleFarmacia[producto.id]
  switch (clave) {
    case 'categoria':
      return producto.categoria?.codigo === valor
    case 'laboratorio':
      return d?.laboratorio === valor
    case 'condicion':
      return d ? (valor === 'receta') === d.exigeReceta : false
    case 'afectacion': {
      const exonerado = producto.presentaciones.some((v) => v.igvTasa === 0)
      return (valor === 'exonerado') === exonerado
    }
    case 'fraccion': {
      const suelto = producto.presentaciones.some((v) => v.fraccionada)
      return (valor === 'si') === suelto
    }
    case 'disponibilidad': {
      const hay = existencias[producto.id] ?? 0
      if (valor === 'agotado') return hay === 0
      if (valor === 'bajo') return hay > 0 && hay <= 20
      return hay > 20
    }
    default:
      // Una faceta desconocida no filtra nada: más vale enseñar de más que
      // vaciar la pantalla por una clave que el adaptador ya no publica.
      return true
  }
}

/** Precio de la presentación más barata: es por el que se ordena. */
function desde(producto: ProductoRef): number {
  return Math.min(...producto.presentaciones.map((v) => v.precio))
}

function ordenar(lista: ProductoRef[], orden: OrdenCatalogo | undefined): ProductoRef[] {
  switch (orden) {
    case 'nombre':
      return [...lista].sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'))
    case 'precio-asc':
      return [...lista].sort((a, b) => desde(a) - desde(b))
    case 'precio-desc':
      return [...lista].sort((a, b) => desde(b) - desde(a))
    default:
      return lista
  }
}

export class CatalogoSimulado implements PuertoCatalogo {
  async buscar(consulta: ConsultaCatalogo): Promise<ProductoRef[]> {
    await new Promise((listo) => setTimeout(listo, 90))

    if (consulta.codigoBarras) {
      const exacto = productos.find((p) => p.codigoBarras === consulta.codigoBarras)
      return exacto ? [enriquecer(exacto)] : []
    }

    // `categoria` sigue llegando aparte porque es la fila de pastillas, que
    // no es un filtro más: es la navegación del catálogo.
    const filtros = { ...consulta.filtros }
    if (consulta.categoria) filtros['categoria'] = consulta.categoria

    const filtrados = productos.filter((producto) =>
      Object.entries(filtros).every(([clave, valor]) => cumple(producto, clave, valor)),
    )

    const texto = normalizar(consulta.texto ?? '')
    if (texto.length === 0) {
      return ordenar(filtrados, consulta.orden)
        .slice(0, consulta.limite ?? 24)
        .map(enriquecer)
    }

    // Busca por descripción y también por principio activo: en una botica se
    // pide tanto «Panadol» como «paracetamol», y a veces el cliente solo
    // recuerda uno de los dos.
    const hallados = filtrados.filter((producto) => {
      const detalle = detalleFarmacia[producto.id]
      return (
        normalizar(producto.descripcion).includes(texto) ||
        (detalle ? normalizar(detalle.principioActivo).includes(texto) : false) ||
        (detalle ? normalizar(detalle.laboratorio).includes(texto) : false) ||
        producto.codigoBarras?.includes(texto) === true
      )
    })

    return ordenar(hallados, consulta.orden)
      .slice(0, consulta.limite ?? 24)
      .map(enriquecer)
  }
}
