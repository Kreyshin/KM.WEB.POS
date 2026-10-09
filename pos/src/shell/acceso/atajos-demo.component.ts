import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { usuariosDemo } from '@pos-adaptadores/simulado/index'

export interface TurnoDemo {
  usuario: string
  pin: string
}

/**
 * Turnos de ejemplo.
 *
 * Vive en su propio componente, y no dentro de la pantalla de acceso, por
 * empaquetado: al montarse con `@defer` queda en un trozo aparte, así que en
 * producción (`KM_DEMO` falso) ni los nombres ni el adaptador simulado entran
 * en el paquete que descarga la caja.
 *
 * En una caja real esta lista la dará un puerto —los cajeros asignados a la
 * sucursal—, y entonces dejará de ser un componente de demo.
 */
@Component({
  selector: 'km-atajos-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-2 gap-2">
      @for (turno of turnos; track turno.id) {
        <button
          class="pv-boton pv-boton-tenue flex-col items-start gap-0 px-3 py-2 text-xs"
          type="button"
          [class.pv-turno-elegido]="elegido() === turno.usuario"
          [attr.aria-pressed]="elegido() === turno.usuario"
          (click)="elegir.emit({ usuario: turno.usuario, pin: turno.pin })"
        >
          <span class="w-full truncate text-left">{{ turno.nombre }}</span>
          <span class="pv-cifra text-tenue text-[11px] font-normal">PIN {{ turno.pin }}</span>
        </button>
      }
    </div>
  `,
})
export class AtajosDemoComponent {
  readonly elegido = input<string | null>(null)
  readonly elegir = output<TurnoDemo>()

  protected readonly turnos = usuariosDemo
}
