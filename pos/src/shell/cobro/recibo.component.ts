import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import type { Cobro, ComprobanteRef, LineaTicket, Totales } from '@pos-core/index'
import { vuelto } from '@pos-core/index'
import { MonedaPipe } from '@pos-core-ui/index'
import { ComandaComponent } from '../acceso/comanda.component'

/**
 * El comprobante, en el mismo papel del acceso.
 *
 * Reutiliza `km-comanda` a propósito: es el objeto que el mostrador produce
 * y verlo aquí cierra el círculo que abre la pantalla de entrada. No es
 * decoración, es también la vista previa de lo que sale por la impresora.
 *
 * Aparece tras cobrar y no antes: el cajero necesita el vuelto a la vista
 * mientras cuenta, y un papel con la boleta encima de ese número sobra.
 */
@Component({
  selector: 'km-recibo',
  imports: [MonedaPipe, ComandaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div class="pv-velo" role="dialog" aria-modal="true" aria-label="Comprobante">
      <button
        class="pv-velo-cierre"
        type="button"
        aria-label="Cerrar"
        (click)="cerrar.emit()"
      ></button>

      <div class="pv-recibo relative">
        <km-comanda
          [titulo]="nombreComprobante()"
          [bajada]="numero()"
          pie="*** GRACIAS POR SU COMPRA ***"
        >
          <div class="flex flex-col gap-2 text-left">
            <ul class="flex flex-col gap-1">
              @for (linea of lineas(); track linea.id) {
                <li class="flex items-start justify-between gap-3 text-[12px]">
                  <span class="min-w-0">
                    <span class="block truncate">{{ linea.descripcion }}</span>
                    <span class="pv-cifra block text-[11px] opacity-60">
                      {{ linea.cantidad }} {{ linea.unidad.abreviatura }} ×
                      {{ linea.precioUnitario | moneda: false }}
                    </span>
                  </span>
                  <span class="pv-cifra shrink-0 font-semibold">
                    {{ linea.cantidad * linea.precioUnitario | moneda: false }}
                  </span>
                </li>
              }
            </ul>

            <div class="pv-comanda-regla"></div>

            <div class="flex flex-col gap-0.5 text-[12px]">
              <div class="flex justify-between">
                <span>Valor de venta</span>
                <span class="pv-cifra">{{ totales().valorVenta | moneda: false }}</span>
              </div>
              <div class="flex justify-between">
                <span>IGV</span>
                <span class="pv-cifra">{{ totales().igv | moneda: false }}</span>
              </div>
              <div class="mt-1 flex justify-between text-base font-bold">
                <span>TOTAL</span>
                <span class="pv-cifra">{{ totales().total | moneda }}</span>
              </div>
            </div>

            <div class="pv-comanda-regla"></div>

            <div class="flex flex-col gap-0.5 text-[12px]">
              @for (pago of cobro().pagos; track $index) {
                <div class="flex justify-between">
                  <span>{{ pago.medio.nombre }}</span>
                  <span class="pv-cifra">{{ pago.importe | moneda: false }}</span>
                </div>
              }
              @if (cambio() > 0) {
                <div class="flex justify-between font-semibold">
                  <span>Vuelto</span>
                  <span class="pv-cifra">{{ cambio() | moneda: false }}</span>
                </div>
              }
            </div>
          </div>
        </km-comanda>

        <div class="mt-4 flex gap-2">
          <button class="pv-boton pv-boton-tenue flex-1 justify-center" type="button" disabled>
            Imprimir
          </button>
          <button
            class="pv-boton pv-boton-accion flex-1 justify-center"
            type="button"
            (click)="cerrar.emit()"
          >
            Nueva venta
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ReciboComponent {
  readonly lineas = input.required<readonly LineaTicket[]>()
  readonly totales = input.required<Totales>()
  readonly cobro = input.required<Cobro>()
  readonly comprobante = input<ComprobanteRef | undefined>(undefined)

  readonly cerrar = output<void>()

  protected readonly cambio = computed(() => vuelto(this.totales().total, this.cobro().pagos))

  protected readonly nombreComprobante = computed(() => {
    const tipo = this.comprobante()?.tipo ?? 'BOL'
    if (tipo === 'FAC') return 'Factura electrónica'
    if (tipo === 'NDV') return 'Nota de venta'
    return 'Boleta de venta'
  })

  protected readonly numero = computed(() => {
    const comprobante = this.comprobante()
    if (!comprobante?.serie) return 'Sin numerar'
    return `${comprobante.serie} - ${comprobante.numero}`
  })
}
