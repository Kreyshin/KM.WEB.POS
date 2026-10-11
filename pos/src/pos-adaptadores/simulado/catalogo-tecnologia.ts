import { IGV_GENERAL, type ProductoRef } from '@pos-core/index'

/**
 * Catálogo de una tienda de tecnología.
 *
 * Es el tercer rubro, y entra para comprobar una sola cosa: que
 * `camposDeLinea` sirve para algo que no sea una receta. Si solo
 * funcionara en farmacia, sería un gancho hecho a medida disfrazado de
 * contrato.
 *
 * Perfil de catálogo distinto a los otros dos: pocas unidades, ticket
 * alto y cada ejemplar identificado. Un televisor no se vende «uno»: se
 * vende ESE, con su serie, porque la garantía va contra el número.
 */

const UND = { codigo: 'UND', nombre: 'Unidad', abreviatura: 'und' }

const productos: ProductoRef[] = [
  {
    id: 't-tv-55',
    categoria: { codigo: 'TELEV', nombre: 'Televisores' },
    icono: 'caja',
    descripcion: 'Televisor LED 55" 4K',
    codigoBarras: '7752000100011',
    unidadAlmacen: UND,
    stock: 4,
    presentaciones: [
      { id: 't1-und', unidad: UND, factorAlmacen: 1, precio: 1899, igvTasa: IGV_GENERAL },
    ],
    ficha: [
      { etiqueta: 'Marca', valor: 'Hisense', destacado: true },
      { etiqueta: 'Pantalla', valor: '55" 4K UHD', destacado: true },
      { etiqueta: 'Garantía', valor: '12 meses de fábrica' },
      { etiqueta: 'Incluye', valor: 'Control remoto, base y cable de poder' },
    ],
  },
  {
    id: 't-celular-128',
    categoria: { codigo: 'CELUL', nombre: 'Celulares' },
    icono: 'caja',
    descripcion: 'Smartphone 128 GB',
    codigoBarras: '7752000100028',
    unidadAlmacen: UND,
    stock: 11,
    presentaciones: [
      { id: 't2-und', unidad: UND, factorAlmacen: 1, precio: 999, igvTasa: IGV_GENERAL },
    ],
    ejes: [{ clave: 'color', etiqueta: 'Color', valores: ['Negro', 'Azul'] }],
    variantes: [
      { id: 't2-negro', atributos: { color: 'Negro' }, stock: 7 },
      { id: 't2-azul', atributos: { color: 'Azul' }, stock: 4 },
    ],
    ficha: [
      { etiqueta: 'Marca', valor: 'Motorola', destacado: true },
      { etiqueta: 'Memoria', valor: '128 GB / 6 GB RAM', destacado: true },
      { etiqueta: 'Garantía', valor: '12 meses' },
    ],
  },
  {
    id: 't-laptop-i5',
    categoria: { codigo: 'COMPU', nombre: 'Cómputo' },
    icono: 'caja',
    descripcion: 'Laptop 15.6" Core i5 512 GB',
    codigoBarras: '7752000100035',
    unidadAlmacen: UND,
    stock: 3,
    presentaciones: [
      { id: 't3-und', unidad: UND, factorAlmacen: 1, precio: 2790, igvTasa: IGV_GENERAL },
    ],
    ficha: [
      { etiqueta: 'Marca', valor: 'Lenovo', destacado: true },
      { etiqueta: 'Procesador', valor: 'Core i5 de 12.ª gen.', destacado: true },
      { etiqueta: 'Garantía', valor: '12 meses' },
    ],
  },
  {
    /* Accesorio: ticket bajo y sin serie. Prueba que el perfil NO pide
       número a todo, que es el error que haría odioso el mostrador. */
    id: 't-cable-hdmi',
    categoria: { codigo: 'ACCES', nombre: 'Accesorios' },
    icono: 'generico',
    descripcion: 'Cable HDMI 2 m',
    codigoBarras: '7752000100042',
    unidadAlmacen: UND,
    stock: 46,
    presentaciones: [
      { id: 't4-und', unidad: UND, factorAlmacen: 1, precio: 29, igvTasa: IGV_GENERAL },
    ],
    ficha: [{ etiqueta: 'Versión', valor: 'HDMI 2.1', destacado: true }],
  },
  {
    id: 't-mouse',
    categoria: { codigo: 'ACCES', nombre: 'Accesorios' },
    icono: 'generico',
    descripcion: 'Mouse inalámbrico',
    codigoBarras: '7752000100059',
    unidadAlmacen: UND,
    stock: 23,
    presentaciones: [
      { id: 't5-und', unidad: UND, factorAlmacen: 1, precio: 59, igvTasa: IGV_GENERAL },
    ],
    ficha: [{ etiqueta: 'Conexión', valor: 'USB 2.4 GHz', destacado: true }],
  },
]

/** Lo que distingue un equipo de otro en la fila: marca y lo principal. */
function nota(producto: ProductoRef): string {
  const destacados = producto.ficha?.filter((campo) => campo.destacado) ?? []
  return destacados.map((campo) => campo.valor).join(' · ')
}

export function catalogoTecnologia(): ProductoRef[] {
  return productos.map((producto) => ({ ...producto, nota: nota(producto) }))
}

/**
 * Los equipos que se entregan con serie.
 *
 * Lo decide el catálogo y no el perfil: mañana la tienda vende monitores
 * y la lista crece aquí, sin tocar código de rubro. Un cable no lleva
 * serie, y pedirla sería hacer odioso el mostrador por nada.
 */
export const CATEGORIAS_CON_SERIE = ['TELEV', 'CELUL', 'COMPU']
