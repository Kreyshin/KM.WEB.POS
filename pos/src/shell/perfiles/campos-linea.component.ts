import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { CampoLinea } from '@pos-core/index'

/**
 * Lo que el perfil pide antes de meter la línea.
 *
 * Deliberadamente pequeño y centrado en el teclado: aparece en mitad de
 * una venta, con cola, y cada milisegundo que robe se paga. El primer
 * campo recibe el foco solo y Entrar confirma, así que el caso normal
 * —un número y seguir— no obliga a tocar el ratón.
 *
 * No sabe de rubros: pinta los campos que el perfil declare. Lo mismo
 * sirve para el número de receta de una botica que para la serie de un
 * televisor.
 */
@Component({
  selector: 'km-campos-linea',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents', '(document:keydown)': 'atajo($event)' },
  template: `
    <div class="pv-velo" role="dialog" aria-modal="true" [attr.aria-label]="titulo()">
      <button
        class="pv-velo-cierre"
        type="button"
        aria-label="Cancelar"
        (click)="cancelar.emit()"
      ></button>

      <div class="pv-panel pv-entra pv-operacion relative w-full max-w-sm p-5">
        <h2 class="pv-titulo-seccion">{{ titulo() }}</h2>
        <p class="text-tenue mt-0.5 text-sm">{{ producto() }}</p>

        <div class="mt-4 flex flex-col gap-3">
          @for (campo of campos(); track campo.clave; let primero = $first) {
            <div class="pv-grupo-campo">
              <label [attr.for]="'campo-' + campo.clave">
                {{ campo.etiqueta }}
                @if (campo.requerido) {
                  <span class="pv-requerido" aria-hidden="true">*</span>
                }
              </label>

              @if (campo.tipo === 'opcion') {
                <select
                  class="pv-campo"
                  [id]="'campo-' + campo.clave"
                  [ngModel]="valores()[campo.clave] ?? ''"
                  (ngModelChange)="escribir(campo.clave, $event)"
                >
                  <option value="">Elige…</option>
                  @for (opcion of campo.opciones ?? []; track opcion.valor) {
                    <option [value]="opcion.valor">{{ opcion.etiqueta }}</option>
                  }
                </select>
              } @else {
                <input
                  class="pv-campo"
                  [id]="'campo-' + campo.clave"
                  [type]="campo.tipo === 'fecha' ? 'date' : 'text'"
                  [attr.inputmode]="campo.modo === 'numerico' ? 'numeric' : null"
                  [attr.data-primero]="primero ? '' : null"
                  autocomplete="off"
                  [ngModel]="valores()[campo.clave] ?? ''"
                  (ngModelChange)="escribir(campo.clave, $event)"
                />
              }

              @if (campo.ayuda) {
                <p class="pv-ayuda-campo">{{ campo.ayuda }}</p>
              }
            </div>
          }
        </div>

        <div class="mt-5 flex gap-2">
          <button
            class="pv-boton pv-boton-tenue flex-1 justify-center"
            type="button"
            (click)="cancelar.emit()"
          >
            Cancelar
          </button>
          <button
            class="pv-boton pv-boton-accion flex-1 justify-center"
            type="button"
            [disabled]="!completo()"
            (click)="confirmar()"
          >
            {{ accion() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CamposLineaComponent {
  readonly campos = input.required<readonly CampoLinea[]>()
  readonly producto = input.required<string>()
  readonly titulo = input('Datos de la línea')
  /**
   * Lo que la línea ya lleva, cuando se reabre para corregirla.
   *
   * Sin esto, cambiar el lote obligaba a volver a teclear también la
   * receta, y el cajero acababa dejándola en blanco.
   */
  readonly valoresIniciales = input<Record<string, unknown>>({})
  /** Qué dice el botón que cierra. Al corregir no se está agregando nada. */
  readonly accion = input('Agregar')

  readonly cancelar = output<void>()
  readonly confirmar_ = output<Record<string, unknown>>()

  /*
   * Arranca con lo que la línea ya llevaba, y se puede escribir encima.
   *
   * `linkedSignal` y no leerlo en el constructor: los `input` se rellenan
   * DESPUÉS de construir el componente, así que allí siempre llegaba vacío
   * y el diálogo de corrección salía con «Elige…» puesto —justo el lote que
   * el cajero estaba intentando conservar—.
   */
  protected readonly valores = linkedSignal<Record<string, string>>(() => {
    const previos: Record<string, string> = {}
    for (const [clave, valor] of Object.entries(this.valoresIniciales())) {
      if (typeof valor === 'string' || typeof valor === 'number') previos[clave] = String(valor)
    }
    return previos
  })

  constructor() {
    /*
     * El foco al primer campo se pone al pintar, no con el atributo
     * `autofocus`: ese es del documento entero y en un diálogo que entra
     * y sale deja el foco donde no toca. Aquí el diálogo ya tiene el
     * control, así que dárselo al campo es correcto y además es lo que
     * espera quien está tecleando sin mirar.
     */
    afterNextRender(() => {
      const primero = document.querySelector<HTMLElement>('[data-primero]')
      primero?.focus()
    })
  }

  protected readonly completo = computed(() =>
    this.campos()
      .filter((campo) => campo.requerido)
      .every((campo) => (this.valores()[campo.clave] ?? '').trim().length > 0),
  )

  protected escribir(clave: string, valor: string): void {
    this.valores.update((actuales) => ({ ...actuales, [clave]: valor }))
  }

  protected confirmar(): void {
    if (!this.completo()) return
    const limpios: Record<string, unknown> = {}
    for (const [clave, valor] of Object.entries(this.valores())) {
      const texto = valor.trim()
      if (texto) limpios[clave] = texto
    }
    this.confirmar_.emit(limpios)
  }

  protected atajo(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.preventDefault()
      this.cancelar.emit()
      return
    }
    // Entrar confirma: el caso normal es un número y seguir, y pedir que
    // además se busque el botón con el ratón es robar tiempo con cola.
    if (evento.key === 'Enter' && this.completo()) {
      evento.preventDefault()
      this.confirmar()
    }
  }
}
