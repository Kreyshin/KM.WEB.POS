import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreTicket, TicketNoEditable, type EntradaLinea } from './store-ticket'
import { IGV_GENERAL } from '../modelo'

const TAB = { codigo: 'TAB', nombre: 'Tableta', abreviatura: 'tab' }
const BLI = { codigo: 'BLI', nombre: 'Blíster x10', abreviatura: 'bli' }

function entrada(parcial: Partial<EntradaLinea> = {}): EntradaLinea {
  return {
    productoId: 'p-paracetamol',
    descripcion: 'Paracetamol 500 mg',
    unidad: TAB,
    factorAlmacen: 1,
    cantidad: 1,
    precioUnitario: 0.5,
    igvTasa: IGV_GENERAL,
    atributos: {},
    ...parcial,
  }
}

describe('store del ticket', () => {
  let store: StoreTicket
  let n: number

  beforeEach(() => {
    n = 0
    store = new StoreTicket({
      sucursalId: 'suc-1',
      perfil: 'farmacia',
      nuevoId: () => `id-${++n}`,
    })
  })

  it('arranca en borrador, vacío y en cero', () => {
    expect(store.ticket.estado).toBe('borrador')
    expect(store.ticket.lineas).toHaveLength(0)
    expect(store.ticket.totales.total).toBe(0)
  })

  describe('agregarLinea', () => {
    it('agrega y recalcula', () => {
      store.agregarLinea(entrada({ cantidad: 4, precioUnitario: 0.5 }))
      expect(store.ticket.lineas).toHaveLength(1)
      expect(store.ticket.totales.total).toBe(2)
    })

    it('suma a la línea existente en vez de duplicar la fila', () => {
      store.agregarLinea(entrada({ cantidad: 1 }))
      store.agregarLinea(entrada({ cantidad: 2 }))

      expect(store.ticket.lineas).toHaveLength(1)
      expect(store.ticket.lineas[0].cantidad).toBe(3)
    })

    it('no mezcla presentaciones distintas del mismo producto', () => {
      store.agregarLinea(entrada({ unidad: TAB, precioUnitario: 0.5, factorAlmacen: 1 }))
      store.agregarLinea(entrada({ unidad: BLI, precioUnitario: 4.5, factorAlmacen: 10 }))

      expect(store.ticket.lineas).toHaveLength(2)
    })

    it('no mezcla lotes distintos, aunque sea el mismo producto', () => {
      store.agregarLinea(entrada({ atributos: { lote: 'A-1' } }))
      store.agregarLinea(entrada({ atributos: { lote: 'B-2' } }))

      expect(store.ticket.lineas).toHaveLength(2)
    })

    it('rechaza una cantidad que no es cantidad', () => {
      expect(() => store.agregarLinea(entrada({ cantidad: 0 }))).toThrow(RangeError)
      expect(() => store.agregarLinea(entrada({ cantidad: -3 }))).toThrow(RangeError)
    })
  })

  describe('cambiarCantidad', () => {
    it('cambia y recalcula', () => {
      const linea = store.agregarLinea(entrada({ cantidad: 1, precioUnitario: 2 }))
      store.cambiarCantidad(linea.id, 5)
      expect(store.ticket.totales.total).toBe(10)
    })

    it('poner cero quita la línea, que es lo que espera quien corrige', () => {
      const linea = store.agregarLinea(entrada())
      store.cambiarCantidad(linea.id, 0)
      expect(store.ticket.lineas).toHaveLength(0)
    })
  })

  it('quitarLinea deja el resto intacto', () => {
    const a = store.agregarLinea(entrada({ productoId: 'a', precioUnitario: 3 }))
    store.agregarLinea(entrada({ productoId: 'b', precioUnitario: 7 }))
    store.quitarLinea(a.id)

    expect(store.ticket.lineas).toHaveLength(1)
    expect(store.ticket.totales.total).toBe(7)
  })

  describe('aplicarDescuento', () => {
    it('descuenta una línea', () => {
      const linea = store.agregarLinea(entrada({ cantidad: 10, precioUnitario: 1 }))
      store.aplicarDescuento(3, linea.id)
      expect(store.ticket.totales.total).toBe(7)
    })

    it('descuenta el ticket entero', () => {
      store.agregarLinea(entrada({ cantidad: 10, precioUnitario: 1 }))
      store.aplicarDescuento(4)
      expect(store.ticket.totales.total).toBe(6)
    })

    it('el descuento del ticket sobrevive a agregar otra línea', () => {
      store.agregarLinea(entrada({ productoId: 'a', cantidad: 10, precioUnitario: 1 }))
      store.aplicarDescuento(4)
      store.agregarLinea(entrada({ productoId: 'b', cantidad: 1, precioUnitario: 5 }))

      expect(store.ticket.totales.total).toBe(11)
    })
  })

  describe('enviarACobro', () => {
    it('pasa a por cobrar', () => {
      store.agregarLinea(entrada())
      store.enviarACobro()
      expect(store.ticket.estado).toBe('por_cobrar')
    })

    it('no envía un ticket vacío', () => {
      expect(() => store.enviarACobro()).toThrow(RangeError)
    })

    it('congela el ticket: lo que se envió es lo que se cobra', () => {
      store.agregarLinea(entrada())
      store.enviarACobro()

      expect(() => store.agregarLinea(entrada())).toThrow(TicketNoEditable)
      expect(() => store.cambiarCantidad('id-2', 9)).toThrow(TicketNoEditable)
      expect(() => store.aplicarDescuento(5)).toThrow(TicketNoEditable)
    })
  })

  it('recorre el ciclo hasta cobrado', () => {
    store.agregarLinea(entrada())
    store.enviarACobro()
    store.marcarCobrado()
    expect(store.ticket.estado).toBe('cobrado')
  })

  it('no permite anular lo ya cobrado', () => {
    store.agregarLinea(entrada())
    store.enviarACobro()
    store.marcarCobrado()
    expect(() => store.anular()).toThrow(/no puede pasar/i)
  })

  it('nuevo() empieza en blanco y con otro identificador', () => {
    store.agregarLinea(entrada())
    const antes = store.ticket.id
    store.nuevo()

    expect(store.ticket.id).not.toBe(antes)
    expect(store.ticket.lineas).toHaveLength(0)
    expect(store.ticket.totales.total).toBe(0)
  })

  describe('suscripción', () => {
    it('avisa al suscribirse y en cada cambio', () => {
      const visto = vi.fn()
      store.suscribir(visto)
      store.agregarLinea(entrada())

      expect(visto).toHaveBeenCalledTimes(2)
    })

    it('deja de avisar al soltarse', () => {
      const visto = vi.fn()
      const soltar = store.suscribir(visto)
      soltar()
      store.agregarLinea(entrada())

      expect(visto).toHaveBeenCalledTimes(1)
    })
  })

  it('no deja modificar el ticket por referencia', () => {
    store.agregarLinea(entrada({ cantidad: 1, precioUnitario: 10 }))
    const antes = store.ticket

    store.agregarLinea(entrada({ productoId: 'otro', cantidad: 1, precioUnitario: 5 }))

    // El ticket anterior conserva su estado: cada operación produce uno nuevo.
    expect(antes.lineas).toHaveLength(1)
    expect(antes.totales.total).toBe(10)
    expect(store.ticket.totales.total).toBe(15)
  })
})
