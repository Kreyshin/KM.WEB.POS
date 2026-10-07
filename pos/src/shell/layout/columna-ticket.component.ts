import { ChangeDetectionStrategy, Component, input } from '@angular/core'

/**
 * Columna del ticket — el ancla de la pantalla de venta.
 *
 * Va siempre a la derecha, siempre visible, siempre en carbón, y no se puede
 * plegar: el cajero tiene que poder mirar el total sin hacer nada. Es la
 * diferencia entre esta vertical y un backoffice, donde el contenido manda y
 * el cromo acompaña; aquí el ticket manda.
 *
 * Hoy solo monta la estructura y el estado vacío. En el **hito 2** las líneas
 * y los totales llegan del store de `pos-core` a través de `pos-core-ui`: este
 * componente pasará a recibirlos, no a inventarlos.
 */
@Component({
  selector: 'km-columna-ticket',
  changeDetection: ChangeDetectionStrategy.OnPush,
  /*
   * El host es el hijo real del contenedor flex, no el <aside>. Sin esto el
   * host queda inline, no se estira, y la columna se encoge a la altura de su
   * contenido: el total deja de estar anclado abajo y aparece a media
   * pantalla.
   */
  host: { class: 'flex shrink-0' },
  template: `
    <aside class="pv-ticket flex w-ticket shrink-0 flex-col" aria-label="Ticket en curso">
      <div class="pv-firma"></div>

      <header class="flex items-baseline justify-between px-5 py-4">
        <p class="pv-etiqueta opacity-70">Ticket</p>
        <p class="pv-cifra text-xs opacity-70">
          {{ lineas() }} {{ lineas() === 1 ? 'línea' : 'líneas' }}
        </p>
      </header>

      <!-- Lista de líneas. El scroll vive aquí y no en la columna entera, para
           que el total nunca se vaya de pantalla por mucho que crezca el ticket. -->
      <div class="min-h-0 flex-1 overflow-auto">
        @if (lineas() === 0) {
          <div class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p class="text-sm opacity-60">Sin líneas</p>
            <p class="text-xs opacity-40">
              Escanea un código o busca un producto para empezar la venta.
            </p>
          </div>
        }
      </div>

      <!-- Totales. Subtotal e impuesto en pequeño; el total, grande. -->
      <div class="px-5 py-3 text-sm opacity-70">
        <div class="flex justify-between">
          <span>Subtotal</span><span class="pv-cifra">{{ moneda }} {{ cero }}</span>
        </div>
        <div class="flex justify-between">
          <span>IGV</span><span class="pv-cifra">{{ moneda }} {{ cero }}</span>
        </div>
      </div>

      <div class="pv-total px-5 py-4">
        <p class="pv-etiqueta mb-1 opacity-70">Total</p>
        <p class="pv-total-cifra">{{ moneda }} {{ cero }}</p>
      </div>

      <div class="p-3">
        <button
          class="pv-boton pv-boton-accion w-full justify-between"
          type="button"
          [disabled]="lineas() === 0"
          [title]="lineas() === 0 ? 'No hay nada que cobrar' : 'Cobrar el ticket'"
        >
          <span>Cobrar</span>
          <span class="pv-tecla">F12</span>
        </button>
      </div>
    </aside>
  `,
})
export class ColumnaTicketComponent {
  /** Número de líneas del ticket. En el hito 2 lo aportará el store. */
  readonly lineas = input(0)

  protected readonly moneda = 'S/'
  protected readonly cero = '0.00'
}
