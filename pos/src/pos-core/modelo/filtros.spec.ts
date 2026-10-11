import { describe, expect, it } from 'vitest'
import {
  alternarFiltro,
  contarFaceta,
  cuantosFiltros,
  cumpleFiltros,
  filtrosActivos,
  quitarFaceta,
  tramoDe,
  tramosDePrecio,
  type Faceta,
} from './filtros'

describe('alternarFiltro', () => {
  it('acumula valores de la misma faceta en vez de reemplazarlos', () => {
    // Es el fallo que hacía inútiles los filtros: elegir «L» borraba «M».
    let filtros = alternarFiltro({}, 'talla', 'M')
    filtros = alternarFiltro(filtros, 'talla', 'L')
    expect(filtros['talla']).toEqual(['M', 'L'])
  })

  it('un segundo toque en la misma opción la quita', () => {
    const puesto = alternarFiltro({}, 'talla', 'M')
    expect(alternarFiltro(puesto, 'talla', 'M')['talla']).toBeUndefined()
  })

  it('al quedarse sin valores la clave desaparece, no queda vacía', () => {
    // Una clave con array vacío contaría como filtro activo sin filtrar nada.
    const vacia = alternarFiltro(alternarFiltro({}, 'color', 'Azul'), 'color', 'Azul')
    expect(Object.keys(vacia)).toEqual([])
  })

  it('no toca el objeto que recibe', () => {
    const original = { talla: ['M'] }
    alternarFiltro(original, 'talla', 'L')
    expect(original['talla']).toEqual(['M'])
  })
})

describe('cuantosFiltros', () => {
  it('cuenta valores y no claves', () => {
    // Cuatro pastillas encendidas decían «1 filtro» cuando se contaban claves.
    expect(cuantosFiltros({ talla: ['M', 'L'], color: ['Azul', 'Negro'] })).toBe(4)
  })
})

describe('cumpleFiltros', () => {
  const camisa = { talla: ['M', 'L'], color: ['Azul'] }
  const valoresDe = (clave: string) => camisa[clave as keyof typeof camisa] ?? []

  it('O dentro de una faceta', () => {
    expect(cumpleFiltros({ talla: ['XL', 'L'] }, valoresDe)).toBe(true)
  })

  it('Y entre facetas distintas', () => {
    expect(cumpleFiltros({ talla: ['M'], color: ['Negro'] }, valoresDe)).toBe(false)
  })

  it('sin filtros pasa todo', () => {
    expect(cumpleFiltros({}, valoresDe)).toBe(true)
  })
})

describe('contarFaceta', () => {
  const productos = [
    { lab: 'Genfar', receta: 'no' },
    { lab: 'Genfar', receta: 'si' },
    { lab: 'Portugal', receta: 'no' },
    { lab: 'Medifarma', receta: 'si' },
  ]
  const valoresDe = (p: (typeof productos)[number], clave: string) => [
    clave === 'lab' ? p.lab : p.receta,
  ]

  it('las cuentas respetan los OTROS filtros puestos', () => {
    // Con «solo con receta» puesto, Portugal no tiene ninguno: prometer
    // «Portugal 1» y dejar la pantalla vacía al pulsar es peor que no contar.
    const opciones = contarFaceta(productos, { receta: ['si'] }, 'lab', valoresDe)
    expect(opciones.find((o) => o.valor === 'Portugal')?.cuantos).toBe(0)
    expect(opciones.find((o) => o.valor === 'Genfar')?.cuantos).toBe(1)
  })

  it('ignora lo puesto en su propia faceta', () => {
    // Si no, con Genfar puesto todos los demás laboratorios darían cero y
    // no se podría añadir un segundo laboratorio sin quitar el primero.
    const opciones = contarFaceta(productos, { lab: ['Genfar'] }, 'lab', valoresDe)
    expect(opciones.find((o) => o.valor === 'Portugal')?.cuantos).toBe(1)
  })

  it('las opciones en cero se devuelven, no se esconden', () => {
    // Esconderlas movería las pastillas de sitio a cada clic.
    const opciones = contarFaceta(productos, { receta: ['si'] }, 'lab', valoresDe)
    expect(opciones).toHaveLength(3)
  })
})

describe('filtrosActivos', () => {
  const facetas: Faceta[] = [
    {
      clave: 'lab',
      etiqueta: 'Laboratorio',
      opciones: [{ valor: 'GF', etiqueta: 'Genfar', cuantos: 2 }],
    },
  ]

  it('trae la etiqueta de la faceta y del valor para poder pintar la pastilla', () => {
    const [activo] = filtrosActivos({ lab: ['GF'] }, facetas)
    expect(activo.faceta).toBe('Laboratorio')
    expect(activo.etiqueta).toBe('Genfar')
  })

  it('un valor que el catálogo ya no publica se enseña crudo, no desaparece', () => {
    // Sigue filtrando: si no se ve, el cajero no sabe qué quitar y acaba
    // diciendo que no hay stock.
    const [activo] = filtrosActivos({ lab: ['XX'] }, facetas)
    expect(activo.etiqueta).toBe('XX')
  })
})

describe('quitarFaceta', () => {
  it('quita la clave entera', () => {
    expect(quitarFaceta({ talla: ['M', 'L'], color: ['Azul'] }, 'talla')).toEqual({
      color: ['Azul'],
    })
  })
})

describe('tramosDePrecio', () => {
  it('los cortes salen del catálogo, no de una tabla fija', () => {
    // En una botica casi todo está bajo 50 soles; en tecnología nada lo está.
    const botica = tramosDePrecio([1.5, 3, 8, 12, 18, 35, 60])
    const tienda = tramosDePrecio([900, 1200, 2400, 3500, 4800])
    expect(botica[0].hasta).toBeLessThan(50)
    expect(tienda[0].hasta).toBeGreaterThan(500)
  })

  it('con menos de cuatro precios distintos no hay tramos', () => {
    // Tres tramos sobre tres productos es un filtro que no filtra.
    expect(tramosDePrecio([10, 20, 30])).toEqual([])
  })

  it('el último tramo no tiene techo', () => {
    const tramos = tramosDePrecio([2, 5, 10, 20, 40, 90])
    expect(tramos[tramos.length - 1].hasta).toBeUndefined()
  })

  it('los tramos cubren todos los precios sin solaparse', () => {
    const precios = [2, 5, 10, 20, 40, 90]
    const tramos = tramosDePrecio(precios)
    for (const precio of precios) {
      const caen = tramos.filter((t) => tramoDe(precio, tramos)?.valor === t.valor)
      expect(caen).toHaveLength(1)
    }
  })
})

describe('contarFaceta, orden', () => {
  const tallas = [{ t: 'M' }, { t: 'XL' }, { t: 'S' }, { t: 'L' }]
  const valoresDe = (p: { t: string }) => [p.t]

  it('con una lista respeta ese orden exacto', () => {
    // Alfabetizar pondría la L antes de la M, y una tira de tallas que no
    // crece no se lee.
    const opciones = contarFaceta(tallas, {}, 't', valoresDe, undefined, ['S', 'M', 'L', 'XL'])
    expect(opciones.map((o) => o.valor)).toEqual(['S', 'M', 'L', 'XL'])
  })

  it('un valor fuera de la lista va al final, no desaparece', () => {
    const opciones = contarFaceta([...tallas, { t: 'XXL' }], {}, 't', valoresDe, undefined, [
      'S',
      'M',
    ])
    expect(opciones[opciones.length - 1].valor).toBe('XXL')
    expect(opciones).toHaveLength(5)
  })
})
