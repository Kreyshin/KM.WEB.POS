import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { usuariosDemo } from '@pos-adaptadores/simulado/index'

/**
 * Turnos del puesto.
 *
 * Se llamaba «atajos de demo» cuando enseñaba nombre y PIN para entrar de un
 * clic. Ya no: ahora es la lista de cajeros del puesto, que es lo que será
 * de verdad cuando la sirva un puerto en el hito 6.
 *
 * Muestra el NOMBRE y nada más. Enseñar la clave junto al nombre, aunque
 * fuera «solo para la demo», es enseñar a operar mal: convierte el PIN en
 * una etiqueta pública y deja la pantalla impresentable delante de un
 * cliente. Las credenciales de la demo viven en la portada, que es donde
 * alguien que viene a probar las busca.
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
  selector: 'km-turnos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-2 gap-2">
      @for (turno of turnos; track turno.id) {
        <button
          class="pv-boton pv-boton-tenue px-3 text-xs"
          type="button"
          [class.pv-turno-elegido]="elegido() === turno.usuario"
          [attr.aria-pressed]="elegido() === turno.usuario"
          (click)="elegir.emit(turno.usuario)"
        >
          <span class="w-full truncate">{{ turno.nombre }}</span>
        </button>
      }
    </div>
  `,
})
export class TurnosComponent {
  readonly elegido = input<string | null>(null)
  readonly elegir = output<string>()

  protected readonly turnos = usuariosDemo
}
