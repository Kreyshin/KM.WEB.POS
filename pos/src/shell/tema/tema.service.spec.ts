import { beforeEach, describe, expect, it } from 'vitest'
import { esTema, temaGuardado, temaPorDefecto, temas } from './tema.service'

describe('tema', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('arranca en oscuro, que es la decisión de producto del POS', () => {
    expect(temaPorDefecto).toBe('oscuro')
    expect(temaGuardado()).toBe('oscuro')
  })

  it('respeta la elección guardada en el puesto', () => {
    localStorage.setItem('km.pos.tema', 'claro')
    expect(temaGuardado()).toBe('claro')
  })

  it('ignora un valor guardado que no es un tema', () => {
    localStorage.setItem('km.pos.tema', 'sepia')
    expect(temaGuardado()).toBe(temaPorDefecto)
  })

  it('reconoce los temas válidos', () => {
    for (const tema of temas) {
      expect(esTema(tema)).toBe(true)
    }
    expect(esTema('sepia')).toBe(false)
  })
})
