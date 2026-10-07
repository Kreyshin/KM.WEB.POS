import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { claveDemo, usuariosDemo } from '@pos-adaptadores/simulado/index'

export interface CredencialAtajo {
  email: string
  clave: string
}

/**
 * Atajos de usuario de ejemplo.
 *
 * Vive en su propio componente, y no dentro del formulario, por una razón de
 * empaquetado: al montarse con `@defer` queda en un trozo aparte, así que en
 * producción (`KM_DEMO` falso) ni los textos ni el adaptador simulado entran
 * en el paquete que descarga la caja. Con un `@if` dentro del formulario los
 * textos viajaban igual, aunque no se vieran.
 */
@Component({
  selector: 'km-atajos-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mt-6 border-t border-linea pt-4">
      <p class="pv-etiqueta text-tenue mb-2">Usuarios de ejemplo</p>
      <div class="flex flex-wrap gap-2">
        @for (usuario of usuarios; track usuario.id) {
          <button
            class="pv-boton pv-boton-tenue px-3 text-xs"
            type="button"
            [disabled]="ocupado()"
            (click)="elegido.emit({ email: usuario.email, clave })"
          >
            {{ usuario.nombre }}
            <span class="text-tenue">· {{ usuario.rol }}</span>
          </button>
        }
      </div>
      <p class="text-tenue mt-2 text-xs">
        La contraseña de todos es <code class="pv-cifra">{{ clave }}</code
        >.
      </p>
    </div>
  `,
})
export class AtajosDemoComponent {
  readonly ocupado = input(false)
  readonly elegido = output<CredencialAtajo>()

  protected readonly usuarios = usuariosDemo
  protected readonly clave = claveDemo
}
