import { ChangeDetectionStrategy, Component, model } from '@angular/core'
import { descripcionEscena, escenas, etiquetaEscena, type Escena } from './escenas.config'

/**
 * Selector flotante de escena.
 *
 * Herramienta de revisión, no parte del producto: permite comparar las tres
 * sin recompilar. Solo se monta en la demo, y se borra junto con las escenas
 * descartadas.
 */
@Component({
  selector: 'km-selector-escena',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pv-panel fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 p-1"
      role="group"
      aria-label="Puesta en escena del acceso"
    >
      @for (opcion of opciones; track opcion) {
        <button
          class="pv-boton px-3 text-xs"
          type="button"
          [class.pv-boton-accion]="escena() === opcion"
          [class.pv-boton-tenue]="escena() !== opcion"
          [attr.aria-pressed]="escena() === opcion"
          [title]="descripcion[opcion]"
          (click)="escena.set(opcion)"
        >
          {{ etiqueta[opcion] }}
        </button>
      }
    </div>
  `,
})
export class SelectorEscenaComponent {
  readonly escena = model.required<Escena>()

  protected readonly opciones = escenas
  protected readonly etiqueta = etiquetaEscena
  protected readonly descripcion = descripcionEscena
}
