import { catalogoRopa } from './catalogo-ropa'
import { catalogoTecnologia } from './catalogo-tecnologia'
import {
  contarFaceta,
  cumpleFiltros,
  ejemplaresDisponibles,
  IGV_GENERAL,
  tramoDe,
  tramosDePrecio,
  type CampoFicha,
  type CategoriaRef,
  type ConsultaCatalogo,
  type EjeVariante,
  type Faceta,
  type OrdenCatalogo,
  type ProductoRef,
  type PuertoCatalogo,
  type PuertoMantenimientoCatalogo,
  type TramoPrecio,
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

const semilla: ProductoRef[] = [
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

/** Una fecha a N días de hoy, en ISO. La demo no puede envejecer. */
function enDias(dias: number): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

/**
 * Lotes en stock, con su vencimiento.
 *
 * Mezcla deliberada: lotes largos, uno a punto de vencer y uno YA
 * vencido. El vencido sigue en los datos porque en una botica real está
 * en el estante hasta que alguien lo da de baja; lo que no puede es
 * ofrecerse para vender, y eso lo filtra `ejemplaresDisponibles`.
 */
const lotes: Record<string, { codigo: string; vence?: string; cantidad: number }[]> = {
  'f-paracetamol-500': [
    { codigo: 'LT-8841', vence: enDias(430), cantidad: 260 },
    { codigo: 'LT-9023', vence: enDias(220), cantidad: 160 },
  ],
  'f-ibuprofeno-400': [{ codigo: 'LT-7712', vence: enDias(300), cantidad: 180 }],
  'f-amoxicilina-500': [
    { codigo: 'LT-5540', vence: enDias(24), cantidad: 20 },
    { codigo: 'LT-6102', vence: enDias(380), cantidad: 40 },
  ],
  'f-metformina-850': [
    { codigo: 'LT-3321', vence: enDias(-15), cantidad: 60 },
    { codigo: 'LT-4450', vence: enDias(510), cantidad: 180 },
  ],
  'f-loratadina-10': [{ codigo: 'LT-2201', vence: enDias(640), cantidad: 95 }],
  'f-alcohol-70': [{ codigo: 'LT-1109', vence: enDias(900), cantidad: 14 }],
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

/**
 * Productos dados de alta o editados desde la aplicación.
 *
 * Capa aparte de la semilla, no una mezcla: así se sabe siempre qué vino
 * con el sistema y qué puso el negocio, y restablecer el catálogo de
 * ejemplo es borrar una llave.
 */
const LLAVE_PROPIOS = 'km.pos.catalogo'

function propios(): ProductoRef[] {
  try {
    const crudo = localStorage.getItem(LLAVE_PROPIOS)
    return crudo ? (JSON.parse(crudo) as ProductoRef[]) : []
  } catch {
    return []
  }
}

function guardarPropios(lista: ProductoRef[]): void {
  try {
    localStorage.setItem(LLAVE_PROPIOS, JSON.stringify(lista))
  } catch {
    // Sin respaldo se sigue vendiendo con lo que haya en memoria.
  }
}

/**
 * El catálogo vigente: la semilla, con lo propio encima.
 *
 * Un producto propio con el mismo id SUSTITUYE al de la semilla, que es lo
 * que permite corregir el precio de un producto de ejemplo sin tocar
 * código. Los que no coinciden se añaden al final.
 */
/**
 * El catálogo vigente de una sucursal.
 *
 * Por sucursal y no uno solo: una tienda de ropa y una botica no venden
 * lo mismo, y servirle paracetamol a Miraflores era lo que hacía que el
 * perfil de ropa no se pudiera ni probar. Qué semilla toca lo decide el
 * prefijo del id de sucursal, que en el back real será el rubro.
 */
function semillaDe(sucursalId: string): ProductoRef[] {
  if (sucursalId.includes('ropa')) return catalogoRopa()
  if (sucursalId.includes('tecnologia')) return catalogoTecnologia()
  return semilla
}

function catalogo(sucursalId = ''): ProductoRef[] {
  const base = semillaDe(sucursalId)
  const mios = propios()
  const porId = new Map(mios.map((producto) => [producto.id, producto]))
  const conEdiciones = base.map((producto) => porId.get(producto.id) ?? producto)
  const nuevos = mios.filter((producto) => !base.some((s) => s.id === producto.id))
  return [...conEdiciones, ...nuevos]
}

/**
 * Compone la línea de contexto, la ficha y el stock que ve la pantalla.
 *
 * Lo que el producto YA traiga se respeta: un producto dado de alta desde
 * la aplicación lleva su propia ficha y su propio stock, y no hay ninguna
 * tabla de farmacia que consultar para él.
 */
function enriquecer(producto: ProductoRef): ProductoRef {
  const detalle = detalleFarmacia[producto.id]
  if (!detalle) return producto

  const partes = [detalle.principioActivo, detalle.laboratorio]
  if (detalle.exigeReceta) partes.push('exige receta')
  return {
    ...producto,
    nota: producto.nota ?? partes.join(' · '),
    ficha: producto.ficha ?? fichaDe(producto),
    stock: producto.stock ?? existencias[producto.id],
    ejemplares: producto.ejemplares ?? lotes[producto.id],
  }
}

/** Las categorías del catálogo, con cuántos productos tiene cada una. */
export function categoriasDelCatalogo(
  sucursalId = '',
): { categoria: CategoriaRef; cuantos: number }[] {
  const cuenta = new Map<string, { categoria: CategoriaRef; cuantos: number }>()
  for (const producto of catalogo(sucursalId)) {
    if (!producto.categoria) continue
    const previo = cuenta.get(producto.categoria.codigo)
    if (previo) previo.cuantos += 1
    else cuenta.set(producto.categoria.codigo, { categoria: producto.categoria, cuantos: 1 })
  }
  return [...cuenta.values()]
}

/**
 * QUÉ VALORES tiene un producto en una faceta.
 *
 * Es la única función que sabe de rubros, y está aquí —en el adaptador— a
 * propósito: el día que entre el back real, esto se cae y lo contesta él.
 * Devuelve una LISTA porque un producto puede tener varios valores en la
 * misma faceta: una camisa está en talla S y en M a la vez, y filtrando por
 * M tiene que salir.
 */
function valoresDe(producto: ProductoRef, clave: string, sucursalId = ''): readonly string[] {
  const detalle = detalleFarmacia[producto.id]

  switch (clave) {
    case 'categoria':
      return producto.categoria ? [producto.categoria.codigo] : []

    case 'precio': {
      // TODAS las presentaciones, no solo la más barata.
      //
      // En una botica la más barata es siempre la pastilla suelta, así que
      // el catálogo entero caía en el primer tramo y la faceta quedaba en
      // «Hasta S/ 1» y «Más de S/ 1»: dos pastillas que no separan nada.
      //
      // Y un producto puede caer en varios tramos a la vez, que es lo
      // correcto: un paracetamol es una compra de S/ 0.50 y también una de
      // S/ 38, según lo que se lleve el cliente.
      const tramos = tramosDe(sucursalId)
      const caen = new Set<string>()
      for (const presentacion of producto.presentaciones) {
        const tramo = tramoDe(presentacion.precio, tramos)
        if (tramo) caen.add(tramo.valor)
      }
      return [...caen]
    }

    case 'disponibilidad': {
      const hay = producto.stock ?? existencias[producto.id] ?? 0
      if (hay === 0) return ['agotado']
      return hay <= 20 ? ['bajo'] : ['ok']
    }

    case 'afectacion':
      return producto.presentaciones.some((v) => v.igvTasa === 0) ? ['exonerado'] : ['gravado']

    case 'fraccion':
      return producto.presentaciones.some((v) => v.fraccionada) ? ['si'] : ['no']

    case 'identificado':
      // Si hay serie o lote registrado se puede decir QUÉ se entrega. En
      // tecnología eso decide si la garantía se podrá tramitar después.
      return ejemplaresDisponibles(producto).length > 0 ? ['si'] : ['no']

    case 'laboratorio':
      return detalle?.laboratorio ? [detalle.laboratorio] : []

    case 'condicion':
      if (!detalle) return []
      return [detalle.exigeReceta ? 'receta' : 'libre']

    default: {
      // Un eje de variante: «talla M», «color Azul». Solo las combinaciones
      // CON existencias, porque ofrecer un filtro que deja la pantalla
      // vacía es peor que no ofrecerlo.
      if (producto.ejes?.some((eje) => eje.clave === clave)) {
        const valores = new Set<string>()
        for (const variante of producto.variantes ?? []) {
          const valor = variante.atributos[clave]
          if (valor && (variante.stock ?? 0) > 0) valores.add(valor)
        }
        return [...valores]
      }

      // Un dato de la ficha que el catálogo marcó como filtrable.
      if (clave.startsWith('ficha:')) {
        const etiqueta = clave.slice('ficha:'.length)
        return (producto.ficha ?? [])
          .filter((campo) => campo.faceta && campo.etiqueta === etiqueta)
          .map((campo) => campo.valor)
      }

      return []
    }
  }
}

/** Las claves de ficha que el catálogo de esta sucursal declara filtrables. */
function clavesDeFicha(productos: readonly ProductoRef[]): readonly string[] {
  const claves = new Map<string, number>()
  for (const producto of productos) {
    for (const campo of producto.ficha ?? []) {
      if (campo.faceta) claves.set(campo.etiqueta, (claves.get(campo.etiqueta) ?? 0) + 1)
    }
  }
  // Una faceta con un solo producto no es un filtro, es un atajo a ese
  // producto: el buscador ya lo hace mejor.
  return [...claves.entries()].filter(([, cuantos]) => cuantos > 1).map(([etiqueta]) => etiqueta)
}

/** Los ejes de variante que aparecen en el catálogo, en su orden declarado. */
function ejesDelCatalogo(productos: readonly ProductoRef[]): readonly EjeVariante[] {
  const porClave = new Map<string, EjeVariante>()
  for (const producto of productos) {
    for (const eje of producto.ejes ?? []) {
      const previo = porClave.get(eje.clave)
      if (!previo) {
        porClave.set(eje.clave, eje)
        continue
      }
      // Dos productos con el mismo eje y valores distintos: se unen
      // respetando el orden en que vienen, que es el bueno (S, M, L, XL).
      const valores = [...previo.valores]
      for (const valor of eje.valores) if (!valores.includes(valor)) valores.push(valor)
      porClave.set(eje.clave, { ...previo, valores })
    }
  }
  return [...porClave.values()]
}

/*
 * Los tramos de precio se guardan entre llamadas: cada faceta los consulta
 * una vez por producto, y recorrer el catálogo entero cada vez se nota al
 * teclear. `olvidarTramos` los tira cuando el catálogo cambia.
 */
const tramosPorSucursal = new Map<string, readonly TramoPrecio[]>()

function tramosDe(sucursalId: string): readonly TramoPrecio[] {
  const guardado = tramosPorSucursal.get(sucursalId)
  if (guardado) return guardado
  const tramos = tramosDePrecio(
    catalogo(sucursalId).flatMap((producto) => producto.presentaciones.map((v) => v.precio)),
  )
  tramosPorSucursal.set(sucursalId, tramos)
  return tramos
}

/** Se llama al dar de alta o editar un producto: los tramos ya no valen. */
export function olvidarTramos(): void {
  tramosPorSucursal.clear()
}

/** ¿Encaja el producto con lo escrito? Lo comparten el buscador y las cuentas. */
function coincideTexto(producto: ProductoRef, texto: string): boolean {
  const buscado = normalizar(texto)
  if (buscado.length === 0) return true
  const detalle = detalleFarmacia[producto.id]
  return (
    normalizar(producto.descripcion).includes(buscado) ||
    normalizar(producto.nota ?? '').includes(buscado) ||
    (detalle ? normalizar(detalle.principioActivo).includes(buscado) : false) ||
    (detalle ? normalizar(detalle.laboratorio).includes(buscado) : false) ||
    producto.codigoBarras?.includes(buscado) === true ||
    // Por serie o por lote: con una garantía en la mano, el número del
    // aparato es lo único que el cliente trae.
    (producto.ejemplares ?? []).some((ejemplar) => normalizar(ejemplar.codigo).includes(buscado)) ||
    // Y por los datos de la ficha que el catálogo declara filtrables:
    // escribir «Hisense» tiene que encontrar el televisor.
    (producto.ficha ?? []).some(
      (campo) => campo.faceta === true && normalizar(campo.valor).includes(buscado),
    )
  )
}

/**
 * Facetas del catálogo, CONTADAS CONTRA LA BÚSQUEDA ACTUAL.
 *
 * Reciben los filtros puestos y el texto escrito porque una cuenta que no
 * los mira miente: con «solo con receta» puesto, prometía «Portugal 1» y al
 * pulsar dejaba la pantalla vacía. Un número que miente estorba más que no
 * poner número.
 *
 * Qué facetas hay lo decide el RUBRO, y las publica el adaptador: la
 * pantalla las pinta sin conocer ninguna. Antes todo rubro que no fuera
 * ropa recibía las de farmacia, así que una tienda de tecnología filtraba
 * por laboratorio y por condición de venta, y las dos salían vacías. Eso es
 * buena parte de por qué los filtros parecían de adorno.
 */
export function facetasDelCatalogo(
  sucursalId = '',
  consulta: Pick<ConsultaCatalogo, 'texto' | 'filtros' | 'categoria'> = {},
): readonly Faceta[] {
  const productos = catalogo(sucursalId)

  // El universo es lo que el TEXTO y la CATEGORÍA dejan pasar; los filtros
  // de faceta los aplica `contarFaceta`, que sabe ignorar la suya propia.
  const universo = productos.filter(
    (producto) =>
      coincideTexto(producto, consulta.texto ?? '') &&
      (!consulta.categoria || producto.categoria?.codigo === consulta.categoria),
  )
  const filtros = consulta.filtros ?? {}

  const faceta = (
    clave: string,
    etiqueta: string,
    etiquetaDe?: (valor: string) => string,
    opciones?: { orden?: boolean | readonly string[]; forma?: Faceta['forma'] },
  ): Faceta => ({
    clave,
    etiqueta,
    forma: opciones?.forma,
    opciones: contarFaceta(
      universo,
      filtros,
      clave,
      (producto, otra) => valoresDe(producto, otra, sucursalId),
      etiquetaDe,
      opciones?.orden ?? true,
    ),
  })

  const facetas: Faceta[] = []

  // Los ejes van PRIMEROS donde existen: en ropa y en celulares la talla y
  // el color son la pregunta del cliente, no un refinamiento.
  for (const eje of ejesDelCatalogo(productos)) {
    // Sin ordenar: el orden declarado es S, M, L, XL, y alfabetizarlo
    // pondría L antes de M.
    // El orden declarado es S, M, L, XL. Sin pasarlo, el orden salía del de
    // los productos y la L caía antes de la M.
    facetas.push(faceta(eje.clave, eje.etiqueta, undefined, { orden: eje.valores }))
  }

  for (const etiqueta of clavesDeFicha(productos)) {
    facetas.push(faceta(`ficha:${etiqueta}`, etiqueta))
  }

  // Laboratorio y receta solo donde existen: en una tienda de ropa eran dos
  // facetas con cero opciones ocupando dos filas.
  const esBotica = !sucursalId.includes('ropa') && !sucursalId.includes('tecnologia')
  if (esBotica) {
    facetas.push(faceta('laboratorio', 'Laboratorio'))
    facetas.push(
      faceta('condicion', 'Condición de venta', (valor) =>
        valor === 'receta' ? 'Con receta' : 'Venta libre',
      ),
    )
    facetas.push(
      faceta('fraccion', 'Fraccionamiento', (valor) =>
        valor === 'si' ? 'Se vende suelto' : 'Solo envase',
      ),
    )
    facetas.push(
      faceta('afectacion', 'IGV', (valor) => (valor === 'exonerado' ? 'Exonerado' : 'Gravado')),
    )
  }

  // El precio filtra en todo rubro: «¿qué tiene hasta cincuenta soles?» es
  // la pregunta más común del mostrador, y no se podía contestar.
  const tramos = tramosDe(sucursalId)
  if (tramos.length > 0) {
    facetas.push(
      faceta(
        'precio',
        'Precio',
        (valor) => tramos.find((t) => t.valor === valor)?.etiqueta ?? valor,
        // De menor a mayor: una tira de precios que no sube no se lee.
        { orden: tramos.map((tramo) => tramo.valor), forma: 'tramos' },
      ),
    )
  }

  if (sucursalId.includes('tecnologia')) {
    // Vender un aparato sin serie registrada es la garantía que no se podrá
    // tramitar después. Poder listarlos es lo que permite arreglarlo HOY.
    facetas.push(
      faceta('identificado', 'Serie registrada', (valor) =>
        valor === 'si' ? 'Con serie' : 'Sin serie',
      ),
    )
  }

  facetas.push(
    faceta('disponibilidad', 'Stock', (valor) =>
      valor === 'agotado' ? 'Agotado' : valor === 'bajo' ? 'Por reponer' : 'Disponible',
    ),
  )

  // Una faceta con una sola opción no decide nada: pulsarla deja la pantalla
  // igual. Ocupaba una fila entera por nada, y es parte de por qué el panel
  // de filtros parecía relleno.
  return facetas.filter((f) => f.opciones.length > 1)
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
  async categorias(sucursalId: string) {
    return categoriasDelCatalogo(sucursalId)
  }

  async facetas(
    sucursalId: string,
    consulta?: Pick<ConsultaCatalogo, 'texto' | 'filtros' | 'categoria'>,
  ) {
    return facetasDelCatalogo(sucursalId, consulta)
  }

  async buscar(consulta: ConsultaCatalogo): Promise<ProductoRef[]> {
    await new Promise((listo) => setTimeout(listo, 90))

    if (consulta.codigoBarras) {
      const exacto = catalogo(consulta.sucursalId).find(
        (p) => p.codigoBarras === consulta.codigoBarras,
      )
      return exacto ? [enriquecer(exacto)] : []
    }

    // `categoria` sigue llegando aparte porque es la fila de pastillas, que
    // no es un filtro más: es la navegación del catálogo.
    const filtros: Record<string, readonly string[]> = { ...consulta.filtros }
    if (consulta.categoria) filtros['categoria'] = [consulta.categoria]

    // El mismo motor que cuenta las facetas decide quién pasa, así que la
    // cuenta de una pastilla y lo que sale al pulsarla no pueden discrepar.
    const hallados = catalogo(consulta.sucursalId).filter(
      (producto) =>
        coincideTexto(producto, consulta.texto ?? '') &&
        cumpleFiltros(filtros, (clave) => valoresDe(producto, clave, consulta.sucursalId)),
    )

    return ordenar(hallados, consulta.orden)
      .slice(0, consulta.limite ?? 24)
      .map(enriquecer)
  }
}

/**
 * Mantenimiento del catálogo desde la aplicación.
 *
 * Escribe en la capa de productos propios, nunca en la semilla: el
 * catálogo de ejemplo tiene que poder restablecerse, y mezclarlos haría
 * imposible saber qué puso el negocio.
 */
export class MantenimientoCatalogoSimulado implements PuertoMantenimientoCatalogo {
  async guardar(entrada: ProductoRef): Promise<ProductoRef> {
    // El id lo pone quien guarda, no la pantalla: así el formulario no
    // tiene que conocer el formato de id de este adaptador.
    const producto: ProductoRef = { ...entrada, id: entrada.id || nuevoProductoId() }
    const lista = propios()
    const indice = lista.findIndex((guardado) => guardado.id === producto.id)
    if (indice === -1) lista.push(producto)
    else lista[indice] = producto
    guardarPropios(lista)
    olvidarTramos()
    return producto
  }

  async eliminar(productoId: string): Promise<void> {
    // Un producto de la semilla no se borra: se tacha guardando una copia
    // con stock 0. Borrarlo de la lista propia solo lo haría reaparecer,
    // porque la semilla sigue ahí.
    const deSemilla = semilla.find((producto) => producto.id === productoId)
    if (deSemilla) {
      await this.guardar({ ...deSemilla, stock: 0 })
      return
    }
    guardarPropios(propios().filter((producto) => producto.id !== productoId))
    olvidarTramos()
  }

  async ajustarStock(sucursalId: string, productoId: string, movimiento: number): Promise<void> {
    const actual = catalogo(sucursalId).find((producto) => producto.id === productoId)
    if (!actual) return
    const enriquecido = enriquecer(actual)
    // Suma sobre lo que hay, y nunca por debajo de cero: un stock negativo
    // no existe en un estante, y arrastrarlo ensucia todos los informes.
    const stock = Math.max(0, (enriquecido.stock ?? 0) + movimiento)
    await this.guardar({ ...enriquecido, stock })
  }
}

/** Id nuevo para un producto dado de alta en el puesto. */
export function nuevoProductoId(): string {
  return `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
