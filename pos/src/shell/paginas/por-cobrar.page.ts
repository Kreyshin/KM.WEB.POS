import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import type { Ticket } from '@pos-core/index'
import { MonedaPipe, PUERTO_TICKETS, TicketService } from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'

/**
 * Pedidos por cobrar.
 *
 * La única pantalla del POS que es una lista, y por eso la única sin la
 * columna del ticket al lado: aquí se ELIGE un ticket, no se construye.
 *
 * Existe por dos situaciones reales. En una botica con dos personas, una
 * arma el pedido en el mostrador y otra cobra en caja. Y está el cliente
 * que se dejó la billetera en el carro: se aparca su ticket y la cola
 * sigue, que es lo que no puede pararse.
 *
 * Los tickets se ordenan del más reciente al más antiguo y los que llevan
 * mucho esperando se marcan. Uno de hace dos horas casi siempre es un
 * pedido abandonado, y conviene que salte a la vista para anularlo y
 * devolver la mercadería al estante.
 */
@Component({
  selector: 'km-por-cobrar-page',
  imports: [MonedaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-fade-in mx-auto flex h-full w-full max-w-5xl flex-col gap-4">
      <header class="flex items-baseline justify-between">
        <div>
          <h2 class="pv-titulo-seccion">Pedidos por cobrar</h2>
          <p class="text-tenue text-sm">
            Tickets armados que esperan pago. Retómalos para cobrarlos en este puesto.
          </p>
        </div>
        <p class="text-tenue text-sm">{{ tickets().length }} en espera</p>
      </header>

      @if (tickets().length === 0) {
        <div class="pv-panel flex flex-1 flex-col items-center justify-center gap-2 p-10">
          <p class="text-sm font-semibold">No hay pedidos en espera</p>
          <p class="text-tenue max-w-sm text-center text-xs">
            Desde el mostrador puedes aparcar un ticket con «Dejar en espera» y aparecerá aquí.
          </p>
        </div>
      } @else {
        <ul class="grid gap-2.5 overflow-auto pb-1 md:grid-cols-2 xl:grid-cols-3">
          @for (ticket of tickets(); track ticket.id) {
            <li class="pv-espera-tarjeta" [class.pv-espera-vieja]="viejo(ticket)">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold">
                    {{ ticket.cliente?.nombre ?? 'Sin cliente' }}
                  </p>
                  <p class="text-tenue text-xs">
                    {{ hora(ticket.creadoEn) }} · {{ ticket.lineas.length }}
                    {{ ticket.lineas.length === 1 ? 'línea' : 'líneas' }}
                    @if (viejo(ticket)) {
                      · <span class="text-aviso">lleva más de 1 h</span>
                    }
                  </p>
                </div>
                <p class="pv-cifra shrink-0 text-base font-bold">
                  {{ ticket.totales.total | moneda }}
                </p>
              </div>

              @if (ticket.nota) {
                <p class="pv-espera-nota">{{ ticket.nota }}</p>
              }

              <ul class="text-tenue flex flex-col gap-0.5 text-xs">
                @for (linea of ticket.lineas.slice(0, 3); track linea.id) {
                  <li class="truncate">
                    {{ linea.cantidad }} {{ linea.unidad.abreviatura }} ·
                    {{ linea.descripcion }}
                  </li>
                }
                @if (ticket.lineas.length > 3) {
                  <li>y {{ ticket.lineas.length - 3 }} más…</li>
                }
              </ul>

              <div class="mt-auto flex gap-2">
                <button
                  class="pv-boton pv-boton-tenue flex-1 justify-center"
                  type="button"
                  (click)="descartar(ticket)"
                >
                  Anular
                </button>
                <button
                  class="pv-boton pv-boton-accion flex-1 justify-center"
                  type="button"
                  (click)="retomar(ticket)"
                >
                  Retomar
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class PorCobrarPage {
  private readonly puerto = inject(PUERTO_TICKETS)
  private readonly ticket = inject(TicketService)
  private readonly sesion = inject(SesionStore)
  private readonly router = inject(Router)

  protected readonly tickets = signal<Ticket[]>([])

  constructor() {
    void this.cargar()
  }

  private async cargar(): Promise<void> {
    this.tickets.set(await this.puerto.porCobrar(this.sesion.sucursal()?.id ?? ''))
  }

  /**
   * Retomar devuelve el ticket al mostrador, no lo cobra aquí.
   *
   * El cobro está donde está el ticket y sus totales, y duplicarlo en esta
   * lista sería mantener dos caminos para la misma operación.
   */
  protected async retomar(ticket: Ticket): Promise<void> {
    this.ticket.cargar({ ...ticket, estado: 'borrador' })
    await this.puerto.quitar(ticket.id)
    await this.router.navigate(['/venta'])
  }

  protected async descartar(ticket: Ticket): Promise<void> {
    await this.puerto.quitar(ticket.id)
    await this.cargar()
  }

  /** Más de una hora en espera: casi siempre un pedido abandonado. */
  protected viejo(ticket: Ticket): boolean {
    if (!ticket.creadoEn) return false
    return Date.now() - new Date(ticket.creadoEn).getTime() > 60 * 60 * 1000
  }

  protected hora(iso?: string): string {
    if (!iso) return 'Sin hora'
    return new Date(iso).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
}
