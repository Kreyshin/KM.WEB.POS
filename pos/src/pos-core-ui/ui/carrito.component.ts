import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { consumoAlmacen, type LineaTicket } from '@pos-core/index'
import { TicketService } from '../estado/ticket.service'
import { MonedaPipe } from './moneda.pipe'

/**
 * El carrito: las líneas del ticket en curso.
 *
 * Es igual para todos los rubros y por eso vive aquí y no en un perfil. Lo
 * que cambia por rubro es cómo se describe la línea, y eso lo aporta
 * `PerfilRubro.describirLinea`; mientras no haya perfil cargado se enseña la
 * descripción del catálogo.
 *
 * Cada fila lleva su cantidad editable y su importe. La cantidad se toca más
 * que nada en un mostrador —el cliente cambia de idea con la cola detrás—,
 * así que tiene botones grandes y no un campo de texto.
 */
@Component({
  selector: 'km-carrito',
  imports: [MonedaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="flex flex-col">
      @for (linea of ticket.lineas(); track linea.id) {
        <li class="pv-ticket-linea pv-fade-in px-5 py-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold">{{ linea.descripcion }}</p>
              <p class="text-xs opacity-60">
                {{ linea.unidad.nombre }}
                <!-- El consumo de almacén solo se enseña cuando difiere de lo
                     vendido: en una tableta suelta sobra, en una caja de 100
                     es justo lo que el cajero necesita comprobar. -->
                @if (linea.factorAlmacen !== 1) {
                  · {{ consumo(linea) }} {{ unidadAlmacen() }}
                }
                @if (linea.igvTasa === 0) {
                  · <span class="font-semibold">exonerado</span>
                }
              </p>
            </div>

            <div class="shrink-0 text-right">
              <p class="pv-cifra text-sm font-semibold">{{ importe(linea) | moneda: false }}</p>
              @if (linea.descuento > 0) {
                <p class="pv-cifra text-xs opacity-60">−{{ linea.descuento | moneda: false }}</p>
              }
            </div>
          </div>

          <div class="mt-2 flex items-center gap-2">
            <button
              class="pv-paso"
              type="button"
              [disabled]="!ticket.editable()"
              [attr.aria-label]="'Quitar una unidad de ' + linea.descripcion"
              (click)="ticket.cambiarCantidad(linea.id, linea.cantidad - 1)"
            >
              −
            </button>
            <span class="pv-cifra w-10 text-center text-sm font-semibold">{{
              linea.cantidad
            }}</span>
            <button
              class="pv-paso"
              type="button"
              [disabled]="!ticket.editable()"
              [attr.aria-label]="'Agregar una unidad de ' + linea.descripcion"
              (click)="ticket.cambiarCantidad(linea.id, linea.cantidad + 1)"
            >
              +
            </button>

            <span class="pv-cifra ml-auto text-xs opacity-50">
              {{ linea.precioUnitario | moneda: false }} c/{{ linea.unidad.abreviatura }}
            </span>

            <button
              class="pv-paso pv-paso-quitar"
              type="button"
              [disabled]="!ticket.editable()"
              [attr.aria-label]="'Quitar ' + linea.descripcion + ' del ticket'"
              (click)="ticket.quitarLinea(linea.id)"
            >
              ×
            </button>
          </div>
        </li>
      }
    </ul>
  `,
})
export class CarritoComponent {
  protected readonly ticket = inject(TicketService)

  protected consumo(linea: LineaTicket): number {
    return consumoAlmacen(linea)
  }

  /** Abreviatura de la unidad de almacén. Llega con el producto en el hito 3. */
  protected unidadAlmacen(): string {
    return 'en almacén'
  }

  protected importe(linea: LineaTicket): number {
    return Math.max(0, linea.cantidad * linea.precioUnitario - linea.descuento)
  }
}
