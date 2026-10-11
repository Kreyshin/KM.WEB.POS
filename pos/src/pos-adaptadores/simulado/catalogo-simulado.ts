import {
  IGV_GENERAL,
  type ConsultaCatalogo,
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
  laboratorio: string
  exigeReceta: boolean
}

const productos: ProductoRef[] = [
  {
    id: 'f-paracetamol-500',
    descripcion: 'Paracetamol 500 mg',
    codigoBarras: '7750001000017',
    // El almacén cuenta tabletas, así que un blíster descuenta 10.
    unidadAlmacen: TAB,
    presentaciones: [
      { id: 'p1-tab', unidad: TAB, factorAlmacen: 1, precio: 0.5, igvTasa: IGV_GENERAL },
      { id: 'p1-bli', unidad: BLI, factorAlmacen: 10, precio: 4.5, igvTasa: IGV_GENERAL },
      { id: 'p1-caj', unidad: CAJ, factorAlmacen: 100, precio: 40, igvTasa: IGV_GENERAL },
    ],
  },
  {
    id: 'f-ibuprofeno-400',
    descripcion: 'Ibuprofeno 400 mg',
    codigoBarras: '7750001000024',
    unidadAlmacen: TAB,
    presentaciones: [
      { id: 'p2-tab', unidad: TAB, factorAlmacen: 1, precio: 0.8, igvTasa: IGV_GENERAL },
      { id: 'p2-bli', unidad: BLI, factorAlmacen: 10, precio: 7, igvTasa: IGV_GENERAL },
    ],
  },
  {
    id: 'f-amoxicilina-500',
    descripcion: 'Amoxicilina 500 mg',
    codigoBarras: '7750001000031',
    unidadAlmacen: TAB,
    presentaciones: [
      { id: 'p3-bli', unidad: BLI, factorAlmacen: 10, precio: 12, igvTasa: IGV_GENERAL },
    ],
  },
  {
    id: 'f-metformina-850',
    descripcion: 'Metformina 850 mg',
    codigoBarras: '7750001000048',
    unidadAlmacen: TAB,
    // Exonerada de IGV: es tratamiento de diabetes. Una boleta que la grave
    // está mal emitida, y por eso la tasa vive en la presentación.
    presentaciones: [
      { id: 'p4-tab', unidad: TAB, factorAlmacen: 1, precio: 0.4, igvTasa: 0 },
      { id: 'p4-bli', unidad: BLI, factorAlmacen: 10, precio: 3.5, igvTasa: 0 },
    ],
  },
  {
    id: 'f-loratadina-10',
    descripcion: 'Loratadina 10 mg',
    codigoBarras: '7750001000055',
    unidadAlmacen: TAB,
    presentaciones: [
      { id: 'p5-tab', unidad: TAB, factorAlmacen: 1, precio: 0.6, igvTasa: IGV_GENERAL },
      { id: 'p5-bli', unidad: BLI, factorAlmacen: 10, precio: 5.5, igvTasa: IGV_GENERAL },
    ],
  },
  {
    id: 'f-alcohol-70',
    descripcion: 'Alcohol medicinal 70° 1 L',
    codigoBarras: '7750001000062',
    unidadAlmacen: FCO,
    presentaciones: [
      { id: 'p6-fco', unidad: FCO, factorAlmacen: 1, precio: 12.9, igvTasa: IGV_GENERAL },
    ],
  },
  {
    id: 'f-jeringa-5',
    descripcion: 'Jeringa descartable 5 ml',
    codigoBarras: '7750001000079',
    unidadAlmacen: UND,
    presentaciones: [
      { id: 'p7-und', unidad: UND, factorAlmacen: 1, precio: 1.2, igvTasa: IGV_GENERAL },
    ],
  },
  {
    id: 'f-mascarilla',
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
    laboratorio: 'Genfar',
    exigeReceta: false,
  },
  'f-ibuprofeno-400': {
    principioActivo: 'Ibuprofeno',
    laboratorio: 'Portugal',
    exigeReceta: false,
  },
  'f-amoxicilina-500': {
    principioActivo: 'Amoxicilina',
    laboratorio: 'Medifarma',
    exigeReceta: true,
  },
  'f-metformina-850': { principioActivo: 'Metformina', laboratorio: 'Hersil', exigeReceta: true },
  'f-loratadina-10': { principioActivo: 'Loratadina', laboratorio: 'Genfar', exigeReceta: false },
  'f-alcohol-70': { principioActivo: 'Etanol', laboratorio: 'Portugal', exigeReceta: false },
  'f-jeringa-5': { principioActivo: '—', laboratorio: 'Nipro', exigeReceta: false },
  'f-mascarilla': { principioActivo: '—', laboratorio: 'Genérico', exigeReceta: false },
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

/** Compone la línea de contexto que la lista enseña bajo el nombre. */
function conNota(producto: ProductoRef): ProductoRef {
  const detalle = detalleFarmacia[producto.id]
  if (!detalle) return producto
  const partes = [detalle.principioActivo, detalle.laboratorio]
  if (detalle.exigeReceta) partes.push('exige receta')
  return { ...producto, nota: partes.join(' · ') }
}

export class CatalogoSimulado implements PuertoCatalogo {
  async buscar(consulta: ConsultaCatalogo): Promise<ProductoRef[]> {
    await new Promise((listo) => setTimeout(listo, 90))

    if (consulta.codigoBarras) {
      const exacto = productos.find((p) => p.codigoBarras === consulta.codigoBarras)
      return exacto ? [conNota(exacto)] : []
    }

    const texto = normalizar(consulta.texto ?? '')
    if (texto.length === 0) return productos.slice(0, consulta.limite ?? 8).map(conNota)

    // Busca por descripción y también por principio activo: en una botica se
    // pide tanto «Panadol» como «paracetamol», y a veces el cliente solo
    // recuerda uno de los dos.
    const hallados = productos.filter((producto) => {
      const detalle = detalleFarmacia[producto.id]
      return (
        normalizar(producto.descripcion).includes(texto) ||
        (detalle ? normalizar(detalle.principioActivo).includes(texto) : false) ||
        producto.codigoBarras?.includes(texto) === true
      )
    })

    return hallados.slice(0, consulta.limite ?? 8).map(conNota)
  }
}
