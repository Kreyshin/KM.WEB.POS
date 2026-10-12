import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

/**
 * Icono de producto.
 *
 * Vocabulario genérico, no de rubro: tableta, cápsula, frasco, inyectable,
 * caja, prenda. El catálogo dice cuál usar y esta capa lo dibuja sin saber
 * qué vende la tienda. Si llega una clave desconocida, cae en el genérico.
 *
 * Cada icono lleva su propio tono, y eso es lo que da vida a una lista que
 * si no sería un muro de texto. El tono NO es el color de marca: el latón
 * queda reservado al dinero, y estos son fríos y apagados a propósito para
 * no competir con el total ni con el botón de cobrar.
 *
 * Dos quedaron fuera al cambiar la identidad. El violeta de la cápsula era
 * el morado de la PLATAFORMA metido dentro del POS, que es justo lo que
 * este producto no quiere parecer. Y la terracota de la prenda rozaba el
 * latón de marca, y un color categórico que se confunde con el de acción
 * deja de ordenar nada.
 */
type Forma = 'tableta' | 'capsula' | 'frasco' | 'inyectable' | 'caja' | 'prenda' | 'generico'

const TONOS: Record<Forma, string> = {
  tableta: '#2f6fb0',
  capsula: '#0f7a8a',
  frasco: '#2a7d62',
  inyectable: '#4a6b8a',
  caja: '#a4505e',
  prenda: '#9c5a7a',
  generico: '#6e7487',
}

@Component({
  selector: 'km-icono-producto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <span
      class="pv-icono"
      [style.--pv-tono]="tono()"
      [style.width.px]="tamano()"
      [style.height.px]="tamano()"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" [attr.width]="interior()" [attr.height]="interior()">
        @switch (forma()) {
          @case ('tableta') {
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8" />
            <path d="M6 12h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          }
          @case ('capsula') {
            <rect
              x="3.5"
              y="8"
              width="17"
              height="8"
              rx="4"
              transform="rotate(-25 12 12)"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <path
              d="M12 8.2 9 15.8"
              transform="rotate(-25 12 12)"
              stroke="currentColor"
              stroke-width="1.8"
            />
          }
          @case ('frasco') {
            <path
              d="M10 3h4v3h-4z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
            <path
              d="M9 6h6l1.6 3.2a4 4 0 0 1 .4 1.8V18a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3v-7a4 4 0 0 1 .4-1.8z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
            <path d="M8 14h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          }
          @case ('inyectable') {
            <path
              d="M14 4l6 6M18.5 5.5l-2 2M16 8 8 16l-3 1 1-3 8-8z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M11 11l2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          }
          @case ('caja') {
            <path
              d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
            <path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9" stroke="currentColor" stroke-width="1.8" />
          }
          @case ('prenda') {
            <path
              d="M9 3 4 6l1.5 4L8 9v12h8V9l2.5 1L20 6l-5-3a3 3 0 0 1-6 0z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          }
          @default {
            <rect
              x="4"
              y="4"
              width="16"
              height="16"
              rx="4"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <path d="M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          }
        }
      </svg>
    </span>
  `,
})
export class IconoProductoComponent {
  readonly clave = input<string | undefined>(undefined)
  readonly tamano = input(38)

  protected readonly forma = computed<Forma>(() => {
    const clave = this.clave()
    return clave && clave in TONOS ? (clave as Forma) : 'generico'
  })

  protected readonly tono = computed(() => TONOS[this.forma()])
  protected readonly interior = computed(() => Math.round(this.tamano() * 0.58))
}
