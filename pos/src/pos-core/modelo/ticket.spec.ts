import { describe, expect, it } from 'vitest'
import { estadosTicket, puedeTransicionar, transicionesTicket } from './ticket'

describe('estados del ticket', () => {
  it('avanza de borrador a por cobrar y de ahí a cobrado', () => {
    expect(puedeTransicionar('borrador', 'por_cobrar')).toBe(true)
    expect(puedeTransicionar('por_cobrar', 'cobrado')).toBe(true)
  })

  it('permite anular desde borrador y desde por cobrar, pero no después', () => {
    expect(puedeTransicionar('borrador', 'anulado')).toBe(true)
    expect(puedeTransicionar('por_cobrar', 'anulado')).toBe(true)
    expect(puedeTransicionar('cobrado', 'anulado')).toBe(false)
  })

  it('no retrocede', () => {
    expect(puedeTransicionar('por_cobrar', 'borrador')).toBe(false)
    expect(puedeTransicionar('cobrado', 'por_cobrar')).toBe(false)
  })

  it('trata cobrado y anulado como estados terminales', () => {
    expect(transicionesTicket.cobrado).toHaveLength(0)
    expect(transicionesTicket.anulado).toHaveLength(0)
  })

  it('declara una transición para cada estado', () => {
    for (const estado of estadosTicket) {
      expect(transicionesTicket[estado]).toBeDefined()
    }
  })
})
