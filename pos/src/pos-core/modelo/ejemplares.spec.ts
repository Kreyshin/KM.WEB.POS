import { describe, expect, it } from 'vitest'
import { ejemplaresDisponibles, porVencimiento } from './catalogo'
import type { EjemplarProducto, ProductoRef } from './catalogo'

const UND = { codigo: 'UND', nombre: 'Unidad', abreviatura: 'und' }

function conEjemplares(ejemplares: EjemplarProducto[]): ProductoRef {
  return {
    id: 'p',
    descripcion: 'Producto',
    unidadAlmacen: UND,
    presentaciones: [{ id: 'p-und', unidad: UND, factorAlmacen: 1, precio: 1, igvTasa: 0.18 }],
    ejemplares,
  }
}

const AHORA = new Date('2026-06-15T12:00:00.000Z')

describe('ejemplares disponibles', () => {
  it('descarta los que están en cero', () => {
    const producto = conEjemplares([
      { codigo: 'A', cantidad: 0 },
      { codigo: 'B', cantidad: 5 },
    ])
    expect(ejemplaresDisponibles(producto, AHORA).map((e) => e.codigo)).toEqual(['B'])
  })

  it('descarta los vencidos, que es la regla que cierra una botica', () => {
    const producto = conEjemplares([
      { codigo: 'VIEJO', cantidad: 40, vence: '2026-05-01' },
      { codigo: 'BUENO', cantidad: 40, vence: '2027-01-01' },
    ])
    expect(ejemplaresDisponibles(producto, AHORA).map((e) => e.codigo)).toEqual(['BUENO'])
  })

  it('el que vence hoy todavía se puede vender', () => {
    // Vence AL final del día: descartarlo sería tirar stock bueno.
    const producto = conEjemplares([{ codigo: 'HOY', cantidad: 10, vence: '2026-06-15' }])
    expect(ejemplaresDisponibles(producto, new Date('2026-06-15T00:00:00.000Z'))).toHaveLength(1)
  })

  it('los que no vencen siempre están disponibles', () => {
    const producto = conEjemplares([{ codigo: 'SERIE-1', cantidad: 1 }])
    expect(ejemplaresDisponibles(producto, AHORA)).toHaveLength(1)
  })

  it('un producto sin ejemplares devuelve lista vacía, no revienta', () => {
    const producto = conEjemplares([])
    delete (producto as { ejemplares?: unknown }).ejemplares
    expect(ejemplaresDisponibles(producto, AHORA)).toEqual([])
  })
})

describe('orden por vencimiento (FEFO)', () => {
  it('primero el que antes caduca', () => {
    const orden = porVencimiento([
      { codigo: 'C', cantidad: 1, vence: '2028-01-01' },
      { codigo: 'A', cantidad: 1, vence: '2026-09-01' },
      { codigo: 'B', cantidad: 1, vence: '2027-03-01' },
    ])
    expect(orden.map((e) => e.codigo)).toEqual(['A', 'B', 'C'])
  })

  it('los que no vencen van al final', () => {
    // Una serie no caduca: no debe colarse antes que un lote que sí.
    const orden = porVencimiento([
      { codigo: 'SERIE', cantidad: 1 },
      { codigo: 'LOTE', cantidad: 1, vence: '2027-03-01' },
    ])
    expect(orden.map((e) => e.codigo)).toEqual(['LOTE', 'SERIE'])
  })

  it('no altera el original', () => {
    const original: EjemplarProducto[] = [
      { codigo: 'B', cantidad: 1, vence: '2028-01-01' },
      { codigo: 'A', cantidad: 1, vence: '2026-01-01' },
    ]
    porVencimiento(original)
    expect(original.map((e) => e.codigo)).toEqual(['B', 'A'])
  })
})
