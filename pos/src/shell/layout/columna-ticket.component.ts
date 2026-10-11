import { ChangeDetectionStrategy, Component, HostListener, inject, viewChild } from '@angular/core'
import type { ElementRef } from '@angular/core'
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
          <!--
            El ticket vacío era medio metro de nada. Ahora enseña el gesto:
            el escáner primero, que es lo que se usa el 90 % de las veces, y
            debajo las teclas que evitan soltar el teclado. Un hueco así de
            grande sin decir nada es espacio que el cajero ya ha pagado.
          -->
          <div class="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
            <span class="pv-espera-icono" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <path
                  d="M3 5v14M6 5v14M9.5 5v14M13 5v14M16.5 5v14M20 5v14"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </span>

            <div>
              <p class="text-sm font-semibold">Listo para escanear</p>
              <p class="text-tenue mx-auto mt-1 max-w-[16rem] text-xs">
                Pasa el código por el lector y la línea entra sola.
              </p>
            </div>

            <dl class="pv-espera-teclas">
              <div>
                <dt>Buscar</dt>
                <dd><kbd class="pv-kbd">/</kbd></dd>
              </div>
              <div>
                <dt>Agregar</dt>
                <dd><kbd class="pv-kbd">Enter</kbd></dd>
              </div>
              <div>
                <dt>Atajos</dt>
                <dd><kbd class="pv-kbd">?</kbd></dd>
              </div>
            </dl>
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
          #cobrar
          class="pv-boton pv-boton-accion w-full justify-between"
          type="button"
          [disabled]="ticket.vacio() || !ticket.editable()"
          [title]="ticket.vacio() ? 'No hay nada que cobrar' : 'Cobrar el ticket'"
        >
          <span>Cobrar</span>
          <span class="text-[11px] opacity-70">Alt + C</span>
        </button>
      </div>
    </aside>
  `,
})
export class ColumnaTicketComponent {
  protected readonly ticket = inject(TicketService)

  private readonly cobrar = viewChild<ElementRef<HTMLButtonElement>>('cobrar')

  /**
   * Alt+C lleva el foco a Cobrar.
   *
   * No lo pulsa: el cobro es irreversible y confirmarlo con una sola tecla
   * desde cualquier sitio de la pantalla es cómo se cobran tickets a medias.
   * Deja el dedo en el botón y es Entrar quien decide.
   */
  @HostListener('document:keydown', ['$event'])
  protected atajo(evento: KeyboardEvent): void {
    if (evento.key.toLowerCase() !== 'c' || !evento.altKey) return
    if (evento.ctrlKey || evento.metaKey) return
    const boton = this.cobrar()?.nativeElement
    if (!boton || boton.disabled) return
    evento.preventDefault()
    boton.focus()
  }
}
