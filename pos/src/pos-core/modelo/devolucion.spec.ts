import { describe, expect, it } from 'vitest'
import {
  aplicableDeNota,
  caminoDeAnulacion,
  devolubles,
  esDevolucionTotal,
  esElectronico,
  esNota,
  importeDevuelto,
  politicaDevolucionPorDefecto,
  problemaDeDevolucion,
  saldoDeNota,
  saldoQueSePierde,
  type Devolucion,
  type NotaConSaldo,
  type PoliticaDevolucion,
} from './devolucion'
import { IGV_GENERAL } from './unidades'
import type { LineaTicket } from './ticket'

const UND = { codigo: 'UND', nombre: 'Unidad', abreviatura: 'und' }

function linea(parcial: Partial<LineaTicket> = {}): LineaTicket {
  return {
    id: 'l-1',
    productoId: 'p-1',
    descripcion: 'Televisor',
    unidad: UND,
    factorAlmacen: 1,
    cantidad: 1,
    precioUnitario: 100,
    igvTasa: IGV_GENERAL,
    descuento: 0,
    atributos: {},
    ...parcial,
  }
}

function devolucion(parcial: Partial<Devolucion> = {}): Devolucion {
  return {
    id: 'd-1',
    ticketId: 't-1',
    comprobanteOrigen: { tipo: 'BOL', serie: 'B001', numero: '00000001' },
    en: '2026-01-10T10:00:00Z',
    lineas: [],
    motivo: { codigo: '07', etiqueta: 'Devolución parcial', conLineas: true },
    camino: 'nota',
    autorizadoPor: 'Elena',
    importe: 0,
    comoSeDevolvio: 'efectivo',
    ...parcial,
  }
}

describe('tipos de comprobante', () => {
  it('la nota de venta no va a SUNAT', () => {
    // Es papel interno: no gasta correlativo de boleta ni se declara.
    expect(esElectronico('NDV')).toBe(false)
    expect(esElectronico('BOL')).toBe(true)
  })

  it('crédito y débito corrigen otro documento; boleta y factura no', () => {
    expect(esNota('NCR')).toBe(true)
    expect(esNota('NDB')).toBe(true)
    expect(esNota('BOL')).toBe(false)
  })
})

describe('caminoDeAnulacion', () => {
  const emitido = (dias: number) => {
    const fecha = new Date('2026-01-20T10:00:00Z')
    fecha.setDate(fecha.getDate() - dias)
    return { tipo: 'BOL', emitidoEn: fecha.toISOString() }
  }
  const ahora = new Date('2026-01-20T10:00:00Z')

  it('dentro del plazo cabe la baja', () => {
    expect(caminoDeAnulacion(emitido(2), politicaDevolucionPorDefecto, false, ahora)).toBe('baja')
  })

  it('pasado el plazo solo queda la nota', () => {
    expect(caminoDeAnulacion(emitido(30), politicaDevolucionPorDefecto, false, ahora)).toBe('nota')
  })

  it('una devolución parcial NUNCA es baja', () => {
    // La venta sigue existiendo por lo que el cliente se quedó. Dar de baja
    // el comprobante entero y emitir otro por la diferencia deja dos
    // documentos donde la norma espera uno.
    expect(caminoDeAnulacion(emitido(1), politicaDevolucionPorDefecto, true, ahora)).toBe('nota')
  })

  it('un comprobante que ya tiene nota no se da de baja', () => {
    // Decir después que nunca existió deja la nota apuntando a un
    // comprobante que no está, y eso no se explica en una fiscalización.
    expect(caminoDeAnulacion(emitido(1), politicaDevolucionPorDefecto, false, ahora, true)).toBe(
      'nota',
    )
  })

  it('la empresa puede exigir nota siempre, aunque la baja quepa', () => {
    // Quien quiere que todo movimiento deje rastro en los libros no da de
    // baja nunca: una venta que desaparece no lo deja.
    const estricta: PoliticaDevolucion = { ...politicaDevolucionPorDefecto, siempreNota: true }
    expect(caminoDeAnulacion(emitido(1), estricta, false, ahora)).toBe('nota')
  })

  it('una nota de venta se anula sin plazo: no hay nada que informar', () => {
    const interna = { tipo: 'NDV', emitidoEn: emitido(90).emitidoEn }
    expect(caminoDeAnulacion(interna, politicaDevolucionPorDefecto, false, ahora)).toBe('baja')
  })

  it('el plazo es un parámetro, no una constante', () => {
    // La administración lo mueve sin pedir permiso.
    const corta: PoliticaDevolucion = { ...politicaDevolucionPorDefecto, diasParaBaja: 1 }
    expect(caminoDeAnulacion(emitido(3), corta, false, ahora)).toBe('nota')
  })
})

describe('devolubles', () => {
  const lineas = [linea({ id: 'l-1', cantidad: 10 }), linea({ id: 'l-2', cantidad: 2 })]

  it('sin devoluciones previas vuelve todo lo vendido', () => {
    expect(devolubles(lineas).map((f) => f.disponible)).toEqual([10, 2])
  })

  it('descuenta lo ya devuelto antes', () => {
    // Sin esto, devolver tres veces la misma unidad es trivial, y es la
    // forma más fácil de vaciar una caja desde el mostrador.
    const previas = [devolucion({ lineas: [{ lineaId: 'l-1', cantidad: 4 }] })]
    expect(devolubles(lineas, previas).map((f) => f.disponible)).toEqual([6, 2])
  })

  it('nunca baja de cero por mucho que se acumule', () => {
    const previas = [
      devolucion({ lineas: [{ lineaId: 'l-2', cantidad: 2 }] }),
      devolucion({ id: 'd-2', lineas: [{ lineaId: 'l-2', cantidad: 5 }] }),
    ]
    expect(devolubles(lineas, previas)[1].disponible).toBe(0)
  })
})

describe('importeDevuelto', () => {
  it('a prorrata del descuento, no al precio de etiqueta', () => {
    // Diez a 100 con 500 de descuento son 500 pagados. Vuelven tres: 150.
    const vendida = linea({ cantidad: 10, precioUnitario: 100, descuento: 500 })
    expect(importeDevuelto([vendida], [{ lineaId: 'l-1', cantidad: 3 }])).toBe(150)
  })

  it('devolver todo devuelve exactamente lo cobrado', () => {
    const vendida = linea({ cantidad: 3, precioUnitario: 33.33, descuento: 10 })
    expect(importeDevuelto([vendida], [{ lineaId: 'l-1', cantidad: 3 }])).toBe(89.99)
  })

  it('no devuelve más de lo que se vendió aunque se pida de más', () => {
    const vendida = linea({ cantidad: 2, precioUnitario: 50 })
    expect(importeDevuelto([vendida], [{ lineaId: 'l-1', cantidad: 99 }])).toBe(100)
  })

  it('una línea que no es de esta venta no suma', () => {
    expect(importeDevuelto([linea()], [{ lineaId: 'otra', cantidad: 1 }])).toBe(0)
  })
})

describe('esDevolucionTotal', () => {
  const lineas = [linea({ id: 'l-1', cantidad: 2 }), linea({ id: 'l-2', cantidad: 1 })]

  it('vuelve todo lo que queda', () => {
    expect(
      esDevolucionTotal(lineas, [
        { lineaId: 'l-1', cantidad: 2 },
        { lineaId: 'l-2', cantidad: 1 },
      ]),
    ).toBe(true)
  })

  it('dejarse una línea la hace parcial', () => {
    expect(esDevolucionTotal(lineas, [{ lineaId: 'l-1', cantidad: 2 }])).toBe(false)
  })

  it('es total contra lo que QUEDA, no contra lo vendido', () => {
    // Si ya se devolvió una parte, devolver el resto sigue siendo total.
    const previas = [devolucion({ lineas: [{ lineaId: 'l-1', cantidad: 2 }] })]
    expect(esDevolucionTotal(lineas, [{ lineaId: 'l-2', cantidad: 1 }], previas)).toBe(true)
  })

  it('sin nada que devolver no es una devolución total', () => {
    const previas = [
      devolucion({
        lineas: [
          { lineaId: 'l-1', cantidad: 2 },
          { lineaId: 'l-2', cantidad: 1 },
        ],
      }),
    ]
    expect(esDevolucionTotal(lineas, [], previas)).toBe(false)
  })
})

describe('problemaDeDevolucion', () => {
  const lineas = [linea({ id: 'l-1', cantidad: 5 })]
  const motivo = { codigo: '07', etiqueta: 'Devolución parcial', conLineas: true }

  it('una devolución correcta no tiene problema', () => {
    expect(
      problemaDeDevolucion(
        lineas,
        [{ lineaId: 'l-1', cantidad: 2 }],
        motivo,
        'Elena',
        politicaDevolucionPorDefecto,
      ),
    ).toBeNull()
  })

  it('no deja devolver más de lo que queda', () => {
    const previas = [devolucion({ lineas: [{ lineaId: 'l-1', cantidad: 4 }] })]
    expect(
      problemaDeDevolucion(
        lineas,
        [{ lineaId: 'l-1', cantidad: 3 }],
        motivo,
        'Elena',
        politicaDevolucionPorDefecto,
        previas,
      ),
    ).toMatch(/quedan 1/)
  })

  it('exige quién autoriza', () => {
    // Una devolución sin responsable no se puede explicar después.
    expect(
      problemaDeDevolucion(
        lineas,
        [{ lineaId: 'l-1', cantidad: 1 }],
        motivo,
        '  ',
        politicaDevolucionPorDefecto,
      ),
    ).toMatch(/autoriza/)
  })

  it('un motivo sin líneas no obliga a elegir líneas', () => {
    // Un error en los datos del cliente no devuelve mercadería.
    const errorDatos = { codigo: '02', etiqueta: 'Error en los datos', conLineas: false }
    expect(
      problemaDeDevolucion(lineas, [], errorDatos, 'Elena', politicaDevolucionPorDefecto),
    ).toBeNull()
  })
})

describe('la nota como medio de pago', () => {
  const nota: NotaConSaldo = {
    comprobante: { tipo: 'NCR', serie: 'NC01', numero: '00000005' },
    emitidaEn: '2026-01-10T10:00:00Z',
    importe: 50,
    consumido: 0,
  }

  it('el saldo baja con cada consumo y nunca es negativo', () => {
    expect(saldoDeNota({ ...nota, consumido: 20 })).toBe(30)
    expect(saldoDeNota({ ...nota, consumido: 80 })).toBe(0)
  })

  it('con saldo parcial se aplica solo lo que hace falta', () => {
    // Nota de 50 contra una compra de 30: se aplican 30 y quedan 20 vivos.
    expect(aplicableDeNota(nota, 30, politicaDevolucionPorDefecto)).toBe(30)
    expect(saldoQueSePierde(nota, 30, politicaDevolucionPorDefecto)).toBe(0)
  })

  it('sin saldo parcial se consume entera y lo que sobra se pierde', () => {
    // Es la política de quien no quiere llevar saldos abiertos. Es dura, y
    // por eso la pantalla avisa antes de aplicarla.
    const estricta: PoliticaDevolucion = { ...politicaDevolucionPorDefecto, saldoParcial: false }
    expect(aplicableDeNota(nota, 30, estricta)).toBe(50)
    expect(saldoQueSePierde(nota, 30, estricta)).toBe(20)
  })

  it('una nota agotada no aporta nada', () => {
    expect(aplicableDeNota({ ...nota, consumido: 50 }, 30, politicaDevolucionPorDefecto)).toBe(0)
  })
})
