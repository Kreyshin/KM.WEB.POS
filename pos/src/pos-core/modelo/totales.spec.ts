import { describe, expect, it } from 'vitest'
import { aCentimos, calcularTotales, igvContenido, totalLinea } from './totales'
import { IGV_GENERAL } from './unidades'
import type { LineaTicket } from './ticket'

const TAB = { codigo: 'TAB', nombre: 'Tableta', abreviatura: 'tab' }
const CAJ = { codigo: 'CAJ', nombre: 'Caja', abreviatura: 'caj' }

function linea(parcial: Partial<LineaTicket> = {}): LineaTicket {
  return {
    id: 'l-1',
    productoId: 'p-1',
    descripcion: 'Paracetamol 500 mg',
    unidad: TAB,
    factorAlmacen: 1,
    cantidad: 1,
    precioUnitario: 1,
    igvTasa: IGV_GENERAL,
    descuento: 0,
    atributos: {},
    ...parcial,
  }
}

describe('IGV contenido en el precio', () => {
  it('lo extrae del precio en vez de sumarlo', () => {
    // 11.80 con IGV incluido contiene 1.80, no 2.12.
    expect(igvContenido(11.8, IGV_GENERAL)).toBe(1.8)
  })

  it('no cobra IGV sobre una presentación exonerada', () => {
    expect(igvContenido(11.8, 0)).toBe(0)
  })
})

describe('totales del ticket', () => {
  it('suma líneas a precio de etiqueta y desglosa el impuesto', () => {
    const t = calcularTotales([linea({ cantidad: 10, precioUnitario: 1.18 })])

    expect(t.bruto).toBe(11.8)
    expect(t.total).toBe(11.8)
    expect(t.igv).toBe(1.8)
    expect(t.valorVenta).toBe(10)
  })

  it('el total es lo que paga el cliente, no bruto más impuesto', () => {
    const t = calcularTotales([linea({ cantidad: 2, precioUnitario: 25 })])
    expect(t.total).toBe(50)
    expect(aCentimos(t.valorVenta + t.igv)).toBe(t.total)
  })

  it('no suma IGV de las líneas exoneradas', () => {
    // Un oncológico exonerado junto a un producto gravado.
    const t = calcularTotales([
      linea({ id: 'a', cantidad: 1, precioUnitario: 100, igvTasa: 0 }),
      linea({ id: 'b', cantidad: 1, precioUnitario: 11.8 }),
    ])

    expect(t.total).toBe(111.8)
    expect(t.igv).toBe(1.8)
  })

  it('descuenta por línea', () => {
    const t = calcularTotales([linea({ cantidad: 10, precioUnitario: 2, descuento: 5 })])
    expect(t.bruto).toBe(20)
    expect(t.descuento).toBe(5)
    expect(t.total).toBe(15)
  })

  it('reparte el descuento de ticket en proporción, para no desglosar mal el IGV', () => {
    // Mitad exonerado, mitad gravado, y 20 de descuento sobre el ticket.
    const t = calcularTotales(
      [
        linea({ id: 'a', cantidad: 1, precioUnitario: 100, igvTasa: 0 }),
        linea({ id: 'b', cantidad: 1, precioUnitario: 100 }),
      ],
      20,
    )

    expect(t.total).toBe(180)
    // Solo la mitad gravada aporta: 90 con IGV incluido contienen 13.73.
    expect(t.igv).toBe(igvContenido(90, IGV_GENERAL))
    expect(aCentimos(t.valorVenta + t.igv)).toBe(t.total)
  })

  it('no deja el total en negativo por un descuento excesivo', () => {
    const t = calcularTotales([linea({ cantidad: 1, precioUnitario: 10 })], 999)
    expect(t.total).toBe(0)
    expect(t.descuento).toBe(10)
  })

  it('redondea en cada paso, para que la suma de las líneas cuadre con el total', () => {
    // Tres tabletas sueltas a 0.335, el caso clásico de descuadre.
    const lineas = [
      linea({ id: 'a', cantidad: 3, precioUnitario: 0.335 }),
      linea({ id: 'b', cantidad: 3, precioUnitario: 0.335 }),
      linea({ id: 'c', cantidad: 3, precioUnitario: 0.335 }),
    ]
    const t = calcularTotales(lineas)
    const sumaImpresa = aCentimos(lineas.reduce((s, l) => s + totalLinea(l), 0))

    expect(t.total).toBe(sumaImpresa)
  })

  it('un ticket vacío vale cero', () => {
    const t = calcularTotales([])
    expect(t).toEqual({ bruto: 0, descuento: 0, valorVenta: 0, igv: 0, total: 0 })
  })

  it('cuenta cada presentación con su propio precio', () => {
    const t = calcularTotales([
      linea({ id: 'a', unidad: TAB, cantidad: 4, precioUnitario: 0.5 }),
      linea({ id: 'b', unidad: CAJ, cantidad: 1, precioUnitario: 18 }),
    ])
    expect(t.total).toBe(20)
  })
})
