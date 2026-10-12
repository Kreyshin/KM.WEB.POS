import { ChangeDetectionStrategy, Component, input, model } from '@angular/core'

export interface Pestana {
  valor: string
  etiqueta: string
  /** Cuántos hay. Se enseña en una pastilla al lado del nombre. */
  cuantos?: number
}

/**
 * Pestañas con subrayado y contador.
 *
 * La forma de `KmTabs` de KM.WEB.RESTAURANT y KM.WEB.TALLER. Subrayado y
 * no pastilla rellena porque esto NAVEGA, no filtra: una pastilla rellena
 * dice «este valor está puesto» y compite con los filtros de verdad, que
 * en esta misma pantalla ya son pastillas. Dos controles con la misma
 * forma y distinto significado es cómo se aprende a desconfiar de una
 * interfaz.
 *
 * El contador va dentro porque la decisión de pulsar depende de él: una
 * pestaña con cero no se pulsa, y saberlo antes ahorra el viaje.
 *
 * Teclado como manda la norma de una lista de pestañas: flechas para
 * moverse, Inicio y Fin a los extremos, y solo la activa es tabulable.
 */
@Component({
  selector: 'km-pestanas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="pv-pestanas" role="tablist" [attr.aria-label]="etiqueta()">
      @for (p of pestanas(); track p.valor; let i = $index) {
        <button
          class="pv-pestana"
          type="button"
          role="tab"
          [class.pv-pestana-activa]="p.valor === activa()"
          [attr.aria-selected]="p.valor === activa()"
          [attr.tabindex]="p.valor === activa() ? 0 : -1"
          (click)="activa.set(p.valor)"
          (keydown)="teclear($event, i)"
        >
          {{ p.etiqueta }}
          @if (p.cuantos !== undefined) {
            <span class="pv-pestana-cuenta">{{ p.cuantos }}</span>
          }
        </button>
      }
    </div>
  `,
})
export class PestanasComponent {
  readonly pestanas = input.required<readonly Pestana[]>()
  readonly activa = model.required<string>()
  readonly etiqueta = input('Secciones')

  protected teclear(evento: KeyboardEvent, indice: number): void {
    const total = this.pestanas().length
    let siguiente = indice
    switch (evento.key) {
      case 'ArrowRight':
        siguiente = (indice + 1) % total
        break
      case 'ArrowLeft':
        siguiente = (indice - 1 + total) % total
        break
      case 'Home':
        siguiente = 0
        break
      case 'End':
        siguiente = total - 1
        break
      default:
        return
    }
    evento.preventDefault()
    this.activa.set(this.pestanas()[siguiente].valor)
    const lista = (evento.currentTarget as HTMLElement).parentElement
    lista?.querySelectorAll<HTMLElement>('.pv-pestana')[siguiente]?.focus()
  }
}
