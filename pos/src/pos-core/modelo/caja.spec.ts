import { describe, expect, it } from 'vitest'
import {
  arquear,
  cobroCompleto,
  diferenciaArqueo,
  diferenciaTotal,
  efectivoEsperado,
  esperadoPorMedio,
  pendiente,
  politicaCajaPorDefecto,
  recibido,
  resumenVentas,
  totalPorMedio,
  type MedioPago,
  type MovimientoCaja,
  type SesionCaja,
  vuelto,
} from './caja'

const EFE: MedioPago = { codigo: 'EFE', nombre: 'Efectivo', daVuelto: true }
const YAPE: MedioPago = { codigo: 'YAP', nombre: 'Yape', daVuelto: false, pideReferencia: true }
const TAR: MedioPago = { codigo: 'VIS', nombre: 'Visa', daVuelto: false }

describe('cobro', () => {
  it('suma lo recibido entre todos los medios', () => {
    expect(
      recibido([
        { medio: EFE, importe: 20 },
        { medio: YAPE, importe: 15.5 },
      ]),
    ).toBe(35.5)
  })

  it('un pago exacto no deja pendiente ni vuelto', () => {
    const pagos = [{ medio: EFE, importe: 12.9 }]
    expect(pendiente(12.9, pagos)).toBe(0)
    expect(vuelto(12.9, pagos)).toBe(0)
    expect(cobroCompleto(12.9, pagos)).toBe(true)
  })

  it('un pago corto deja pendiente y no completa', () => {
    const pagos = [{ medio: EFE, importe: 10 }]
    expect(pendiente(12.9, pagos)).toBe(2.9)
    expect(cobroCompleto(12.9, pagos)).toBe(false)
  })

  it('el efectivo de más es vuelto, no un cobro mayor', () => {
    const pagos = [{ medio: EFE, importe: 50 }]
    expect(vuelto(31.4, pagos)).toBe(18.6)
    expect(pendiente(31.4, pagos)).toBe(0)
  })

  it('en pago mixto solo el efectivo puede dar vuelto', () => {
    // 20 por Yape y 20 en billete sobre un total de 31.40: el vuelto sale
    // del efectivo, que cubre 11.40 de los 20 entregados.
    const pagos = [
      { medio: YAPE, importe: 20 },
      { medio: EFE, importe: 20 },
    ]
    expect(pendiente(31.4, pagos)).toBe(0)
    expect(vuelto(31.4, pagos)).toBe(8.6)
  })

  it('un pago digital que cubre de sobra no genera vuelto', () => {
    // Nadie devuelve efectivo porque la tarjeta pasó de más: eso sería
    // sacar dinero del cajón por un cobro que no entró en él.
    const pagos = [{ medio: TAR, importe: 40 }]
    expect(vuelto(31.4, pagos)).toBe(0)
  })

  it('no acumula residuos de coma flotante', () => {
    const pagos = [
      { medio: EFE, importe: 0.1 },
      { medio: EFE, importe: 0.2 },
    ]
    expect(recibido(pagos)).toBe(0.3)
    expect(cobroCompleto(0.3, pagos)).toBe(true)
  })

  it('un cobro sin pagos nunca está completo, ni con total cero', () => {
    expect(cobroCompleto(0, [])).toBe(false)
  })
})

function sesionCon(movimientos: MovimientoCaja[], fondoInicial = 100): SesionCaja {
  return {
    id: 's-1',
    sucursalId: 'suc-1',
    usuarioId: 'u-1',
    usuarioNombre: 'Rosa Quispe',
    abiertaEn: '2026-01-01T08:00:00.000Z',
    fondoInicial,
    estado: 'abierta',
    movimientos,
  }
}

const venta = (importe: number, medio: string, ticketId: string): MovimientoCaja => ({
  id: `m-${ticketId}-${medio}`,
  en: '2026-01-01T09:00:00.000Z',
  tipo: 'venta',
  concepto: 'Venta',
  medio,
  importe,
  ticketId,
})

describe('sesión de caja', () => {
  it('el efectivo esperado solo cuenta el efectivo y los movimientos de gaveta', () => {
    const sesion = sesionCon([
      venta(30, 'EFE', 't-1'),
      venta(20, 'YAP', 't-2'),
      { id: 'm-3', en: '', tipo: 'egreso', concepto: 'Movilidad', importe: -15 },
    ])
    // 100 inicial + 30 en efectivo − 15 de egreso. Los 20 de Yape no están
    // en el cajón.
    expect(efectivoEsperado(sesion)).toBe(115)
  })

  it('desglosa lo cobrado por medio', () => {
    const sesion = sesionCon([
      venta(30, 'EFE', 't-1'),
      venta(20, 'YAP', 't-2'),
      venta(10, 'EFE', 't-3'),
    ])
    expect(totalPorMedio(sesion)).toEqual([
      { medio: 'EFE', importe: 40 },
      { medio: 'YAP', importe: 20 },
    ])
  })

  it('cuenta tickets y no movimientos, porque uno mixto deja dos', () => {
    const sesion = sesionCon([venta(20, 'EFE', 't-1'), venta(11.4, 'YAP', 't-1')])
    expect(resumenVentas(sesion)).toEqual({ cuantas: 1, importe: 31.4, devuelto: 0 })
  })

  it('el arqueo corto sale negativo y el sobrante positivo', () => {
    const sesion = sesionCon([venta(30, 'EFE', 't-1')])
    expect(diferenciaArqueo(sesion, 125)).toBe(-5)
    expect(diferenciaArqueo(sesion, 135)).toBe(5)
    expect(diferenciaArqueo(sesion, 130)).toBe(0)
  })
})

describe('arqueo por medio (contrato congelado D-012)', () => {
  const EFE = { codigo: 'EFE', nombre: 'Efectivo', daVuelto: true }
  const YPE = { codigo: 'YPE', nombre: 'Yape', daVuelto: false, pideReferencia: true }
  const VIS = { codigo: 'VIS', nombre: 'Visa', daVuelto: false, pideReferencia: true }
  const medios = [EFE, YPE, VIS]

  function turno(): SesionCaja {
    return {
      id: 's-1',
      sucursalId: 'suc-1',
      usuarioId: 'u-1',
      usuarioNombre: 'Elena',
      abiertaEn: '2026-01-01T08:00:00Z',
      fondoInicial: 100,
      estado: 'abierta',
      movimientos: [
        mov({ tipo: 'venta', medio: 'EFE', importe: 60 }),
        mov({ tipo: 'venta', medio: 'YPE', importe: 40 }),
        mov({ tipo: 'egreso', concepto: 'Compra de bolsas', importe: -15 }),
      ],
    }
  }

  function mov(parcial: Partial<MovimientoCaja>): MovimientoCaja {
    return {
      id: 'm-1',
      en: '2026-01-01T09:00:00Z',
      tipo: 'venta',
      concepto: 'Venta',
      importe: 0,
      ...parcial,
    }
  }

  it('el efectivo esperado es el cajón, no lo vendido', () => {
    // 100 de fondo + 60 cobrados en efectivo − 15 de la gaveta. Los 40 de
    // Yape no están en el cajón.
    expect(efectivoEsperado(turno())).toBe(145)
  })

  it('cada medio no-efectivo espera lo cobrado por él y nada más', () => {
    const filas = esperadoPorMedio(turno(), medios)
    expect(filas.find((f) => f.medio === 'YPE')?.esperado).toBe(40)
    expect(filas.find((f) => f.medio === 'VIS')?.esperado).toBe(0)
  })

  it('cuenta los medios que no son efectivo, que es lo que no se hacía', () => {
    // El cierre viejo solo contaba el cajón. Un total de Yape que no cuadra
    // con el extracto no lo veía nadie hasta fin de mes.
    const conteo = arquear(turno(), medios, { EFE: 145, YPE: 35, VIS: 0 })
    expect(conteo.find((c) => c.medio === 'YPE')?.diferencia).toBe(-5)
    expect(diferenciaTotal(conteo)).toBe(-5)
  })

  it('un medio sin contar va a cero: no contarlo no es que cuadre', () => {
    const conteo = arquear(turno(), medios, { EFE: 145 })
    expect(conteo.find((c) => c.medio === 'YPE')?.contado).toBe(0)
    expect(conteo.find((c) => c.medio === 'YPE')?.diferencia).toBe(-40)
  })

  it('un turno que cuadra da diferencia cero', () => {
    expect(diferenciaTotal(arquear(turno(), medios, { EFE: 145, YPE: 40, VIS: 0 }))).toBe(0)
  })

  it('el cierre ciego es el valor por defecto', () => {
    // El que protege al negocio del que lo configura mal: si quien cuenta ve
    // lo esperado, escribe ese número y el arqueo deja de medir nada.
    expect(politicaCajaPorDefecto.cierreCiego).toBe(true)
  })
})

describe('devoluciones en el turno', () => {
  function turnoCon(movimientos: MovimientoCaja[]): SesionCaja {
    return {
      id: 's-1',
      sucursalId: 'suc-1',
      usuarioId: 'u-1',
      usuarioNombre: 'Elena',
      abiertaEn: '2026-01-01T08:00:00Z',
      fondoInicial: 100,
      estado: 'abierta',
      movimientos,
    }
  }
  const mov = (p: Partial<MovimientoCaja>): MovimientoCaja => ({
    id: 'm',
    en: '2026-01-01T09:00:00Z',
    tipo: 'venta',
    concepto: '',
    importe: 0,
    ...p,
  })

  it('una devolución en efectivo sale del cajón', () => {
    const turno = turnoCon([
      mov({ tipo: 'venta', medio: 'EFE', importe: 60, ticketId: 't-1' }),
      mov({ tipo: 'devolucion', medio: 'EFE', importe: -20, ticketId: 't-1' }),
    ])
    expect(efectivoEsperado(turno)).toBe(140)
  })

  it('las ventas del turno se enseñan NETAS de lo devuelto', () => {
    // Enseñar lo bruto obliga al cajero a restar de cabeza para saber
    // cuánto entró, y ahí es donde se equivoca.
    const turno = turnoCon([
      mov({ tipo: 'venta', medio: 'EFE', importe: 100, ticketId: 't-1' }),
      mov({ tipo: 'devolucion', medio: 'EFE', importe: -30, ticketId: 't-1' }),
    ])
    expect(resumenVentas(turno)).toEqual({ cuantas: 1, importe: 70, devuelto: 30 })
  })

  it('una devolución no cuenta como un ticket más', () => {
    const turno = turnoCon([
      mov({ tipo: 'venta', medio: 'EFE', importe: 50, ticketId: 't-1' }),
      mov({ tipo: 'devolucion', medio: 'EFE', importe: -50, ticketId: 't-1' }),
    ])
    expect(resumenVentas(turno).cuantas).toBe(1)
  })
})
