import { describe, expect, it } from 'vitest'
import { comprobantesPara, documentoValido, type Cliente } from './cliente'

describe('documento del cliente', () => {
  it('un DNI son ocho dígitos exactos', () => {
    expect(documentoValido('DNI', '45678912')).toBe(true)
    expect(documentoValido('DNI', '4567891')).toBe(false)
    expect(documentoValido('DNI', '456789123')).toBe(false)
    expect(documentoValido('DNI', '4567891a')).toBe(false)
  })

  it('un RUC son once dígitos y empieza por un prefijo válido', () => {
    expect(documentoValido('RUC', '20512345678')).toBe(true)
    expect(documentoValido('RUC', '10456789123')).toBe(true)
    // 30 no es un prefijo que SUNAT emita: una factura con él nace nula.
    expect(documentoValido('RUC', '30512345678')).toBe(false)
    expect(documentoValido('RUC', '2051234567')).toBe(false)
  })

  it('no exige longitud fija al carné ni al pasaporte', () => {
    expect(documentoValido('CE', '001234567')).toBe(true)
    expect(documentoValido('PAS', 'X12345')).toBe(true)
    expect(documentoValido('PAS', 'X123')).toBe(false)
  })

  it('ignora los espacios de alrededor', () => {
    expect(documentoValido('DNI', '  45678912  ')).toBe(true)
  })
})

const conRuc: Cliente = {
  id: 'c-1',
  tipoDocumento: 'RUC',
  documento: '20512345678',
  nombre: 'Clínica San Pablo',
}
const conDni: Cliente = { id: 'c-2', tipoDocumento: 'DNI', documento: '45678912', nombre: 'Ana' }

describe('comprobantes admitidos', () => {
  it('solo con RUC se puede facturar', () => {
    expect(comprobantesPara(conRuc)).toContain('FAC')
    expect(comprobantesPara(conDni)).not.toContain('FAC')
  })

  it('sin cliente quedan boleta y nota de venta', () => {
    expect(comprobantesPara(null)).toEqual(['BOL', 'NDV'])
  })
})
