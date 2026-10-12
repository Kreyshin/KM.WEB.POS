import { describe, expect, it } from 'vitest'
import {
  claveDeVariante,
  combinacionesDe,
  nivelDeStock,
  primerCodigoRepetido,
  problemaDelProducto,
  PUNTO_REPOSICION,
  quedanLasUltimas,
  ULTIMAS_UNIDADES,
} from './producto'
import { IGV_GENERAL } from './unidades'
import type { PresentacionVenta } from './unidades'

const UND = { codigo: 'UND', nombre: 'Unidad', abreviatura: 'und' }

function presentacion(parcial: Partial<PresentacionVenta> = {}): PresentacionVenta {
  return { id: 'p1', unidad: UND, factorAlmacen: 1, precio: 10, igvTasa: IGV_GENERAL, ...parcial }
}

describe('nivelDeStock', () => {
  it('sin stock conocido no es lo mismo que agotado', () => {
    // El POS se vende sin módulo de almacén. Confundirlos haría que un
    // catálogo sin inventario apareciera entero agotado.
    expect(nivelDeStock(undefined)).toBe('sincontrol')
    expect(nivelDeStock(0)).toBe('agotado')
  })

  it('el punto de reposición entra en «bajo», no en «ok»', () => {
    expect(nivelDeStock(PUNTO_REPOSICION)).toBe('bajo')
    expect(nivelDeStock(PUNTO_REPOSICION + 1)).toBe('ok')
  })

  it('un stock negativo se lee como agotado', () => {
    // No debería existir, pero si un ajuste mal hecho lo deja así, el
    // mostrador tiene que decir «no hay», no enseñar «-3 disponibles».
    expect(nivelDeStock(-3)).toBe('agotado')
  })
})

describe('quedanLasUltimas', () => {
  it('avisa por debajo del umbral, no en cero ni sin control', () => {
    // «Quedan dos» es lo que el vendedor le dice al cliente que duda;
    // «agotado» y «no lo controlamos» son otras dos conversaciones.
    expect(quedanLasUltimas(ULTIMAS_UNIDADES)).toBe(true)
    expect(quedanLasUltimas(ULTIMAS_UNIDADES + 1)).toBe(false)
    expect(quedanLasUltimas(0)).toBe(false)
    expect(quedanLasUltimas(undefined)).toBe(false)
  })

  it('es un umbral distinto del punto de reposición', () => {
    // Reponer lo decide el almacén con calma; esto lo dice el vendedor con
    // el cliente delante. Fundirlos haría gritar «últimas» con veinte.
    expect(ULTIMAS_UNIDADES).toBeLessThan(PUNTO_REPOSICION)
  })
})

describe('combinacionesDe', () => {
  const ejes = [{ clave: 'talla' }, { clave: 'color' }]

  it('multiplica los valores marcados de cada eje', () => {
    const combos = combinacionesDe(ejes, { talla: ['S', 'M'], color: ['Azul', 'Negro'] })
    expect(combos).toHaveLength(4)
    expect(combos.map((c) => claveDeVariante(ejes, c.atributos))).toEqual([
      'S|Azul',
      'S|Negro',
      'M|Azul',
      'M|Negro',
    ])
  })

  it('un eje sin valores marcados no multiplica por cero', () => {
    // Marcar solo tallas tiene que dar una fila por talla, no ninguna.
    expect(combinacionesDe(ejes, { talla: ['S', 'M'], color: [] })).toHaveLength(2)
  })

  it('sin nada marcado no hay matriz', () => {
    expect(combinacionesDe(ejes, {})).toEqual([])
  })

  it('conserva lo tecleado en las combinaciones que siguen existiendo', () => {
    // Es la regla que importa: desmarcar «M» por error y volver a marcarlo
    // no puede borrar el stock que alguien acababa de contar en «S».
    const antes = combinacionesDe(ejes, { talla: ['S', 'M'], color: ['Azul'] })
    const conDatos = antes.map((c) =>
      c.atributos['talla'] === 'S' ? { ...c, stock: 7, precio: 99 } : c,
    )

    const despues = combinacionesDe(ejes, { talla: ['S'], color: ['Azul'] }, conDatos)
    const volvio = combinacionesDe(ejes, { talla: ['S', 'M'], color: ['Azul'] }, despues)

    expect(volvio.find((c) => c.atributos['talla'] === 'S')?.stock).toBe(7)
    expect(volvio.find((c) => c.atributos['talla'] === 'S')?.precio).toBe(99)
    expect(volvio.find((c) => c.atributos['talla'] === 'M')?.stock).toBeUndefined()
  })

  it('el stock sin declarar se queda sin declarar, no en cero', () => {
    // «No queda» y «no lo tenemos» son dos respuestas distintas.
    const [combo] = combinacionesDe([{ clave: 'talla' }], { talla: ['S'] })
    expect(combo.stock).toBeUndefined()
  })
})

describe('problemaDelProducto', () => {
  const bueno = { descripcion: 'Camisa Oxford', presentaciones: [presentacion()] }

  it('un producto completo no tiene problema', () => {
    expect(problemaDelProducto(bueno)).toBeNull()
  })

  it('pide los problemas en el orden del formulario, no de gravedad', () => {
    // Mandar al usuario al final de la pantalla y luego de vuelta al
    // principio es peor que pedírselo en orden.
    const roto = {
      descripcion: '',
      presentaciones: [presentacion({ precio: 0 })],
      ficha: [{ etiqueta: 'Marca', valor: '' }],
    }
    expect(problemaDelProducto(roto)).toBe('Falta la descripción.')
  })

  it('una forma de venta sin precio no se guarda', () => {
    expect(
      problemaDelProducto({ ...bueno, presentaciones: [presentacion({ precio: 0 })] }),
    ).toMatch(/precio/)
  })

  it('un dato de ficha con etiqueta y sin valor se señala', () => {
    expect(problemaDelProducto({ ...bueno, ficha: [{ etiqueta: 'Marca', valor: ' ' }] })).toMatch(
      /ficha/,
    )
  })

  it('nombra el ejemplar repetido con la palabra del rubro', () => {
    const problema = problemaDelProducto(
      {
        ...bueno,
        ejemplares: [
          { codigo: 'SN-1', cantidad: 1 },
          { codigo: 'SN-1', cantidad: 1 },
        ],
      },
      'Serie',
    )
    expect(problema).toContain('serie SN-1')
  })
})

describe('primerCodigoRepetido', () => {
  it('los códigos en blanco no cuentan como repetidos', () => {
    // Una fila recién añadida está vacía, y eso no es un error todavía.
    expect(
      primerCodigoRepetido([
        { codigo: '', cantidad: 1 },
        { codigo: '', cantidad: 1 },
      ]),
    ).toBeNull()
  })

  it('ignora los espacios de alrededor', () => {
    expect(
      primerCodigoRepetido([
        { codigo: 'LT-1', cantidad: 1 },
        { codigo: ' LT-1 ', cantidad: 1 },
      ]),
    ).toBe('LT-1')
  })
})
