import { ChangeDetectionStrategy, Component, model } from '@angular/core'
import {
  descripcionVariante,
  etiquetaVariante,
  variantesAcceso,
  type VarianteAcceso,
} from './acceso.config'

/**
 * Selector flotante de variante.
 *
 * Es una herramienta de revisión, no parte del producto: permite comparar las
 * tres puestas en escena sin recompilar. Solo se monta en la demo.
 */
@Component({
  selector: 'km-selector-variante',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pv-panel fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 p-1"
      role="group"
      aria-label="Variante de la pantalla de acceso"
    >
      @for (opcion of variantes; track opcion) {
        <button
          class="pv-boton px-3 text-xs"
          type="button"
          [class.pv-boton-accion]="variante() === opcion"
          [class.pv-boton-tenue]="variante() !== opcion"
          [attr.aria-pressed]="variante() === opcion"
          [title]="descripcion[opcion]"
          (click)="variante.set(opcion)"
        >
          {{ etiqueta[opcion] }}
        </button>
      }
    </div>
  `,
})
export class SelectorVarianteComponent {
  readonly variante = model.required<VarianteAcceso>()

  protected readonly variantes = variantesAcceso
  protected readonly etiqueta = etiquetaVariante
  protected readonly descripcion = descripcionVariante
}
