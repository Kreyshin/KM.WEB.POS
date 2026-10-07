import { describe, expect, it } from 'vitest'
import {
  descripcionVariante,
  esVarianteAcceso,
  etiquetaVariante,
  varianteAccesoPorDefecto,
  variantesAcceso,
} from './acceso.config'

describe('variantes de acceso', () => {
  it('reconoce las válidas y rechaza el resto', () => {
    expect(esVarianteAcceso('teclado')).toBe(true)
    expect(esVarianteAcceso('mostrador')).toBe(true)
    expect(esVarianteAcceso('ficha')).toBe(false)
    expect(esVarianteAcceso(null)).toBe(false)
    expect(esVarianteAcceso(7)).toBe(false)
  })

  it('tiene la variante por defecto dentro de la lista', () => {
    expect(variantesAcceso).toContain(varianteAccesoPorDefecto)
  })

  it('etiqueta y describe todas las variantes', () => {
    for (const variante of variantesAcceso) {
      expect(etiquetaVariante[variante]).toBeTruthy()
      expect(descripcionVariante[variante]).toBeTruthy()
    }
  })
})
