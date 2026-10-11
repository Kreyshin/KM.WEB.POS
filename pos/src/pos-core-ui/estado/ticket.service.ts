import { computed, Injectable, signal } from '@angular/core'
import {
  StoreTicket,
  totalesVacios,
  type EntradaLinea,
  type OpcionesStore,
  type Ticket,
} from '@pos-core/index'

/**
 * El store del ticket, envuelto en señales.
 *
 * El store de verdad vive en `pos-core` y es TypeScript puro. Esto es solo la
 * envoltura: suscribe, vuelca en una señal y delega. Ninguna regla vive aquí,
 * y es a propósito —lo que decide cuánto se cobra se prueba sin navegador—.
 *
 * El servicio no sabe en qué sucursal está ni qué perfil corre: eso lo trae
 * la sesión, que es del shell, y `pos-core-ui` no puede importar el shell. Por
 * eso hay un `abrir()` que el shell llama cuando ya tiene sesión.
 */
@Injectable({ providedIn: 'root' })
export class TicketService {
  private store: StoreTicket | null = null
  private soltar: (() => void) | null = null

  private readonly _ticket = signal<Ticket | null>(null)

  readonly ticket = this._ticket.asReadonly()
  readonly lineas = computed(() => this._ticket()?.lineas ?? [])
  readonly totales = computed(() => this._ticket()?.totales ?? totalesVacios)
  readonly cantidadLineas = computed(() => this.lineas().length)
  readonly vacio = computed(() => this.cantidadLineas() === 0)
  readonly estado = computed(() => this._ticket()?.estado ?? null)
  readonly editable = computed(() => this.estado() === 'borrador')

  /** Lo que suman las líneas antes de descuentos. Techo del que se regatea. */
  readonly bruto = computed(() =>
    this.lineas().reduce((suma, linea) => suma + linea.cantidad * linea.precioUnitario, 0),
  )

  /** Abre el mostrador sobre una sucursal y un perfil. Lo llama el shell. */
  abrir(opciones: OpcionesStore): void {
    this.soltar?.()
    this.store = new StoreTicket(opciones)
    this.soltar = this.store.suscribir((ticket) => this._ticket.set(ticket))
  }

  /** Cierra el mostrador al cerrar turno, para no dejar un ticket colgando. */
  cerrar(): void {
    this.soltar?.()
    this.soltar = null
    this.store = null
    this._ticket.set(null)
  }

  agregarLinea<A extends Record<string, unknown>>(entrada: EntradaLinea<A>): void {
    this.exigirAbierto().agregarLinea(entrada)
  }

  cambiarCantidad(lineaId: string, cantidad: number): void {
    this.exigirAbierto().cambiarCantidad(lineaId, cantidad)
  }

  /** Cambia los datos del rubro de una línea: el lote, la serie, la talla. */
  cambiarAtributos(lineaId: string, atributos: Record<string, unknown>): void {
    this.exigirAbierto().cambiarAtributos(lineaId, atributos)
  }

  quitarLinea(lineaId: string): void {
    this.exigirAbierto().quitarLinea(lineaId)
  }

  aplicarDescuento(importe: number, lineaId?: string): void {
    this.exigirAbierto().aplicarDescuento(importe, lineaId)
  }

  anotar(nota: string): void {
    this.exigirAbierto().anotar(nota)
  }

  enviarACobro(): void {
    this.exigirAbierto().enviarACobro()
  }

  /** Retoma un ticket aparcado para cobrarlo. */
  cargar(ticket: Parameters<StoreTicket['cargar']>[0]): void {
    this.exigirAbierto().cargar(ticket)
  }

  marcarCobrado(): void {
    this.exigirAbierto().marcarCobrado()
  }

  nuevo(): void {
    this.exigirAbierto().nuevo()
  }

  private exigirAbierto(): StoreTicket {
    if (!this.store) {
      throw new Error('El mostrador no está abierto: falta llamar a TicketService.abrir().')
    }
    return this.store
  }
}
