import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { CarritoComponent, MonedaPipe, TicketService } from '@pos-core-ui/index'

/**
 * Columna del ticket — el ancla de la pantalla de venta.
 *
 * Va siempre a la derecha, siempre visible, siempre en carbón, y no se puede
 * plegar: el cajero tiene que poder mirar el total sin hacer nada. Esa es la
 * diferencia con un backoffice, donde el contenido manda y el cromo
 * acompaña; aquí manda el ticket.
 *
 * El scroll vive en la lista de líneas y no en la columna, para que el total
 * no se vaya de pantalla por largo que sea el ticket.
 */
@Component({
  selector: 'km-columna-ticket',
  imports: [CarritoComponent, MonedaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  /*
   * El host es el hijo real del contenedor flex, no el <aside>. Sin esto el
   * host queda inline, no se estira, y la columna se encoge a la altura de
   * su contenido: el total deja de estar anclado abajo.
   */
  host: { class: 'flex shrink-0' },
  template: `
    <aside class="pv-ticket flex w-ticket flex-col" aria-label="Ticket en curso">
      <div class="pv-firma"></div>

      <header class="flex items-baseline justify-between px-5 py-4">
        <p class="pv-etiqueta opacity-70">Ticket</p>
        <p class="pv-cifra text-xs opacity-70">
          {{ ticket.cantidadLineas() }}
          {{ ticket.cantidadLineas() === 1 ? 'línea' : 'líneas' }}
        </p>
      </header>

      <div class="min-h-0 flex-1 overflow-auto">
        @if (ticket.vacio()) {
          <div class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p class="text-sm opacity-60">Sin líneas</p>
            <p class="text-xs opacity-40">
              Escanea un código o busca un producto para empezar la venta.
            </p>
          </div>
        } @else {
          <km-carrito />
        }
      </div>

      <div class="px-5 py-3 text-sm opacity-70">
        <div class="flex justify-between">
          <span>Valor de venta</span>
          <span class="pv-cifra">{{ ticket.totales().valorVenta | moneda }}</span>
        </div>
        <div class="flex justify-between">
          <span>IGV</span>
          <span class="pv-cifra">{{ ticket.totales().igv | moneda }}</span>
        </div>
        @if (ticket.totales().descuento > 0) {
          <div class="flex justify-between">
            <span>Descuento</span>
            <span class="pv-cifra">−{{ ticket.totales().descuento | moneda }}</span>
          </div>
        }
      </div>

      <div class="pv-total px-5 py-4">
        <p class="pv-etiqueta mb-1 opacity-70">Total</p>
        <p class="pv-total-cifra">{{ ticket.totales().total | moneda }}</p>
      </div>

      <div class="p-3">
        <button
          class="pv-boton pv-boton-accion w-full justify-between"
          type="button"
          [disabled]="ticket.vacio() || !ticket.editable()"
          [title]="ticket.vacio() ? 'No hay nada que cobrar' : 'Cobrar el ticket'"
        >
          <span>Cobrar</span>
          <span class="pv-tecla">F12</span>
        </button>
      </div>
    </aside>
  `,
})
export class ColumnaTicketComponent {
  protected readonly ticket = inject(TicketService)
}
