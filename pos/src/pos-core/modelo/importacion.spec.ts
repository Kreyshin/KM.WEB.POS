import { describe, expect, it } from 'vitest'
import {
  analizarFilas,
  columnasPlantilla,
  fichaDeTexto,
  numeroDeHoja,
  siONo,
  type FilaHoja,
} from './importacion'
import { IGV_GENERAL } from './unidades'

describe('números escritos a mano en una hoja', () => {
  it('acepta el punto decimal', () => {
    expect(numeroDeHoja('4.50')).toBe(4.5)
  })

  it('acepta la coma decimal, que es lo que teclea medio continente', () => {
    expect(numeroDeHoja('4,50')).toBe(4.5)
  })

  it('quita el separador de millar que mete Excel', () => {
    expect(numeroDeHoja('1,234.50')).toBe(1234.5)
    expect(numeroDeHoja('1.234,50')).toBe(1234.5)
  })

  it('ignora los espacios', () => {
    expect(numeroDeHoja('  12 ')).toBe(12)
  })

  it('devuelve null con lo que no es un número', () => {
    expect(numeroDeHoja('doce soles')).toBeNull()
    expect(numeroDeHoja('')).toBeNull()
  })
})

describe('sí o no', () => {
  it('reconoce las formas que la gente escribe', () => {
    for (const verdadero of ['si', 'Sí', 'SI', 'x', 'X', '1', 'true', 'verdadero']) {
      expect(siONo(verdadero)).toBe(true)
    }
    for (const falso of ['no', '', '0', 'tal vez']) {
      expect(siONo(falso)).toBe(false)
    }
  })
})

describe('ficha en una celda', () => {
  it('parte por | y por el primer dos puntos', () => {
    expect(fichaDeTexto('Principio activo: Paracetamol | Laboratorio: Genfar')).toEqual([
      { etiqueta: 'Principio activo', valor: 'Paracetamol' },
      { etiqueta: 'Laboratorio', valor: 'Genfar' },
    ])
  })

  it('conserva los dos puntos que vengan dentro del valor', () => {
    expect(fichaDeTexto('Horario: de 8:00 a 20:00')).toEqual([
      { etiqueta: 'Horario', valor: 'de 8:00 a 20:00' },
    ])
  })

  it('lo que no trae etiqueta entra como nota', () => {
    expect(fichaDeTexto('Refrigerar')).toEqual([{ etiqueta: 'Nota', valor: 'Refrigerar' }])
  })

  it('una celda vacía no da campos', () => {
    expect(fichaDeTexto('')).toEqual([])
  })
})

const base = (extra: Partial<Record<string, string>> = {}): FilaHoja => ({
  codigo: 'PAR500',
  descripcion: 'Paracetamol 500 mg',
  unidad_almacen: 'TAB',
  venta_unidad: 'TAB',
  equivale_a: '1',
  precio: '0.50',
  ...extra,
})

describe('análisis de filas', () => {
  it('una fila da un producto con una forma de venta', () => {
    const { productos, errores } = analizarFilas([base()])
    expect(errores).toEqual([])
    expect(productos).toHaveLength(1)
    expect(productos[0].descripcion).toBe('Paracetamol 500 mg')
    expect(productos[0].presentaciones).toHaveLength(1)
    expect(productos[0].presentaciones[0].precio).toBe(0.5)
    expect(productos[0].presentaciones[0].igvTasa).toBe(IGV_GENERAL)
  })

  it('agrupa por código: varias filas son un producto con varias formas', () => {
    const { productos, errores } = analizarFilas([
      base(),
      base({ venta_unidad: 'BLI', equivale_a: '10', precio: '4.50' }),
      base({ venta_unidad: 'CAJ', equivale_a: '100', precio: '40' }),
    ])
    expect(errores).toEqual([])
    expect(productos).toHaveLength(1)
    expect(productos[0].presentaciones.map((p) => p.unidad.codigo)).toEqual(['TAB', 'BLI', 'CAJ'])
  })

  it('las filas siguientes no necesitan repetir la descripción', () => {
    const { productos, errores } = analizarFilas([
      base(),
      { codigo: 'PAR500', venta_unidad: 'BLI', equivale_a: '10', precio: '4.50' },
    ])
    expect(errores).toEqual([])
    expect(productos[0].presentaciones).toHaveLength(2)
  })

  it('marca lo exonerado y lo que se vende suelto', () => {
    const { productos } = analizarFilas([base({ exonerado: 'si', suelta: 'x' })])
    expect(productos[0].presentaciones[0].igvTasa).toBe(0)
    expect(productos[0].presentaciones[0].fraccionada).toBe(true)
  })

  it('una fila mala no tumba la carga entera', () => {
    // Con 500 productos, abortar todo por una errata obliga a repetir el
    // ciclo completo por cada una. Se descarta la fila, no la carga.
    const { productos, errores } = analizarFilas([
      base(),
      base({ codigo: 'IBU400', descripcion: 'Ibuprofeno 400 mg', precio: 'ocho soles' }),
      base({ codigo: 'LOR10', descripcion: 'Loratadina 10 mg', precio: '0.60' }),
    ])
    expect(productos.map((p) => p.id)).toEqual(['PAR500', 'LOR10'])
    expect(errores).toHaveLength(1)
    expect(errores[0].fila).toBe(3)
    expect(errores[0].columna).toBe('precio')
  })

  it('el número de fila es el de la hoja, contando el encabezado', () => {
    const { errores } = analizarFilas([base(), base({ codigo: 'X', precio: '0' })])
    expect(errores[0].fila).toBe(3)
  })

  it('rechaza un precio de cero o negativo', () => {
    expect(analizarFilas([base({ precio: '0' })]).productos).toHaveLength(0)
    expect(analizarFilas([base({ precio: '-3' })]).productos).toHaveLength(0)
  })

  it('rechaza una equivalencia que no sea mayor que cero', () => {
    const { errores } = analizarFilas([base({ equivale_a: '0' })])
    expect(errores[0].columna).toBe('equivale_a')
  })

  it('avisa si se repite la misma unidad en un producto', () => {
    // Un copia y pega: sin aviso, la segunda pisaría a la primera callando.
    const { productos, errores } = analizarFilas([base(), base({ precio: '0.70' })])
    expect(productos[0].presentaciones).toHaveLength(1)
    expect(productos[0].presentaciones[0].precio).toBe(0.5)
    expect(errores[0].columna).toBe('venta_unidad')
  })

  it('ignora las filas en blanco sin protestar', () => {
    const { productos, errores } = analizarFilas([base(), {}, { codigo: '', descripcion: '' }])
    expect(productos).toHaveLength(1)
    expect(errores).toEqual([])
  })

  it('exige descripción solo en la primera fila del producto', () => {
    const { errores } = analizarFilas([
      { codigo: 'NUEVO', venta_unidad: 'UND', equivale_a: '1', precio: '1' },
    ])
    expect(errores[0].columna).toBe('descripcion')
  })

  it('un icono desconocido avisa pero no descarta el producto', () => {
    const { productos, errores } = analizarFilas([base({ icono: 'pastilla' })])
    expect(productos).toHaveLength(1)
    expect(productos[0].icono).toBe('generico')
    expect(errores[0].columna).toBe('icono')
  })

  it('lee la ficha y las existencias de la primera fila', () => {
    const { productos } = analizarFilas([
      base({ stock: '420', ficha: 'Laboratorio: Genfar' }),
      base({ venta_unidad: 'BLI', equivale_a: '10', precio: '4.50', stock: '999' }),
    ])
    expect(productos[0].stock).toBe(420)
    expect(productos[0].ficha).toEqual([{ etiqueta: 'Laboratorio', valor: 'Genfar' }])
  })

  it('sin unidad de venta usa la de almacén', () => {
    const { productos, errores } = analizarFilas([
      { codigo: 'A', descripcion: 'Algo', unidad_almacen: 'UND', equivale_a: '1', precio: '2' },
    ])
    expect(errores).toEqual([])
    expect(productos[0].presentaciones[0].unidad.codigo).toBe('UND')
  })

  it('la plantilla declara las columnas obligatorias que el análisis exige', () => {
    const obligatorias = columnasPlantilla.filter((c) => c.obligatoria).map((c) => c.clave)
    expect(obligatorias).toEqual([
      'codigo',
      'descripcion',
      'unidad_almacen',
      'venta_unidad',
      'equivale_a',
      'precio',
    ])
  })
})
