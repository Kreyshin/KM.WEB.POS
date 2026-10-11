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
    // Las series que están en tienda ahora mismo. Cantidad 1 porque una
    // serie es, por definición, un aparato.
    ejemplares: [
      { codigo: 'HS55-2401-00871', cantidad: 1 },
      { codigo: 'HS55-2401-00872', cantidad: 1 },
      { codigo: 'HS55-2402-01140', cantidad: 1 },
      { codigo: 'HS55-2402-01155', cantidad: 1 },
    ],
    ficha: [
      { etiqueta: 'Marca', valor: 'Hisense', destacado: true, faceta: true },
      { etiqueta: 'Pantalla', valor: '55" 4K UHD', destacado: true },
      { etiqueta: 'Garantía', valor: '12 meses', faceta: true },
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
    stock: 5,
    presentaciones: [
      { id: 't2-und', unidad: UND, factorAlmacen: 1, precio: 999, igvTasa: IGV_GENERAL },
    ],
    ejes: [{ clave: 'color', etiqueta: 'Color', valores: ['Negro', 'Azul'] }],
    variantes: [
      { id: 't2-negro', atributos: { color: 'Negro' }, stock: 3 },
      { id: 't2-azul', atributos: { color: 'Azul' }, stock: 2 },
    ],
    /* Un IMEI pertenece a un color concreto: no se puede entregar el
       negro y anotar la serie de uno azul. Por eso llevan `varianteId`. */
    ejemplares: [
      { codigo: '356938035643809', cantidad: 1, varianteId: 't2-negro' },
      { codigo: '356938035643817', cantidad: 1, varianteId: 't2-negro' },
      { codigo: '356938035643825', cantidad: 1, varianteId: 't2-negro' },
      { codigo: '356938035690112', cantidad: 1, varianteId: 't2-azul' },
      { codigo: '356938035690120', cantidad: 1, varianteId: 't2-azul' },
    ],
    ficha: [
      { etiqueta: 'Marca', valor: 'Motorola', destacado: true, faceta: true },
      { etiqueta: 'Memoria', valor: '128 GB / 6 GB RAM', destacado: true },
      { etiqueta: 'Garantía', valor: '12 meses', faceta: true },
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
    ejemplares: [
      { codigo: 'LNV-82X1-00455', cantidad: 1 },
      { codigo: 'LNV-82X1-00456', cantidad: 1 },
      { codigo: 'LNV-82X3-01287', cantidad: 1 },
    ],
    ficha: [
      { etiqueta: 'Marca', valor: 'Lenovo', destacado: true, faceta: true },
      { etiqueta: 'Procesador', valor: 'Core i5 de 12.ª gen.', destacado: true },
      { etiqueta: 'Garantía', valor: '12 meses', faceta: true },
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
    ficha: [
      { etiqueta: 'Marca', valor: 'Genérico', destacado: true, faceta: true },
      { etiqueta: 'Versión', valor: 'HDMI 2.1', destacado: true },
      { etiqueta: 'Garantía', valor: '3 meses', faceta: true },
    ],
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
    ficha: [
      { etiqueta: 'Marca', valor: 'Logitech', destacado: true, faceta: true },
      { etiqueta: 'Conexión', valor: 'USB 2.4 GHz', destacado: true },
      { etiqueta: 'Garantía', valor: '12 meses', faceta: true },
    ],
  },
  {
    id: 't-monitor-24',
    categoria: { codigo: 'COMPU', nombre: 'Cómputo' },
    icono: 'caja',
    descripcion: 'Monitor 24" IPS 100 Hz',
    codigoBarras: '7752000100066',
    unidadAlmacen: UND,
    stock: 6,
    presentaciones: [
      { id: 't6-und', unidad: UND, factorAlmacen: 1, precio: 549, igvTasa: IGV_GENERAL },
    ],
    ejemplares: [
      { codigo: 'LNV-M24-07741', cantidad: 1 },
      { codigo: 'LNV-M24-07742', cantidad: 1 },
      { codigo: 'LNV-M24-07758', cantidad: 1 },
    ],
    ficha: [
      { etiqueta: 'Marca', valor: 'Lenovo', destacado: true, faceta: true },
      { etiqueta: 'Pantalla', valor: '24" IPS 100 Hz', destacado: true },
      { etiqueta: 'Garantía', valor: '12 meses', faceta: true },
    ],
  },
  {
    /* Vendido sin serie registrada a propósito: es lo que la faceta
       «Sin serie» tiene que sacar a la luz, porque es la garantía que
       mañana no se podrá tramitar. */
    id: 't-audifonos-bt',
    categoria: { codigo: 'ACCES', nombre: 'Accesorios' },
    icono: 'generico',
    descripcion: 'Audífonos Bluetooth',
    codigoBarras: '7752000100073',
    unidadAlmacen: UND,
    stock: 14,
    presentaciones: [
      { id: 't7-und', unidad: UND, factorAlmacen: 1, precio: 149, igvTasa: IGV_GENERAL },
    ],
    ficha: [
      { etiqueta: 'Marca', valor: 'Logitech', destacado: true, faceta: true },
      { etiqueta: 'Autonomía', valor: '30 h con estuche', destacado: true },
      { etiqueta: 'Garantía', valor: '12 meses', faceta: true },
    ],
  },
  {
    id: 't-tv-43',
    categoria: { codigo: 'TELEV', nombre: 'Televisores' },
    icono: 'caja',
    descripcion: 'Televisor LED 43" Full HD',
    codigoBarras: '7752000100080',
    unidadAlmacen: UND,
    stock: 2,
    presentaciones: [
      { id: 't8-und', unidad: UND, factorAlmacen: 1, precio: 899, igvTasa: IGV_GENERAL },
    ],
    ejemplares: [
      { codigo: 'HS43-2403-00210', cantidad: 1 },
      { codigo: 'HS43-2403-00214', cantidad: 1 },
    ],
    ficha: [
      { etiqueta: 'Marca', valor: 'Hisense', destacado: true, faceta: true },
      { etiqueta: 'Pantalla', valor: '43" Full HD', destacado: true },
      { etiqueta: 'Garantía', valor: '12 meses', faceta: true },
    ],
  },
  {
    /* Agotado: la faceta de stock tiene que tener algo que enseñar, y un
       catálogo donde todo está disponible es un catálogo de folleto. */
    id: 't-teclado-mec',
    categoria: { codigo: 'ACCES', nombre: 'Accesorios' },
    icono: 'generico',
    descripcion: 'Teclado mecánico retroiluminado',
    codigoBarras: '7752000100097',
    unidadAlmacen: UND,
    stock: 0,
    presentaciones: [
      { id: 't9-und', unidad: UND, factorAlmacen: 1, precio: 229, igvTasa: IGV_GENERAL },
    ],
    ficha: [
      { etiqueta: 'Marca', valor: 'Logitech', destacado: true, faceta: true },
      { etiqueta: 'Interruptores', valor: 'Rojos lineales', destacado: true },
      { etiqueta: 'Garantía', valor: '12 meses', faceta: true },
    ],
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
