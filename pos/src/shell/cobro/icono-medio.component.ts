import { ChangeDetectionStrategy, Component, input } from '@angular/core'

/** Glifos de los medios de pago. Dibujados aquí para no traer una librería. */
@Component({
  selector: 'km-icono-medio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
      @switch (clave()) {
        @case ('efectivo') {
          <rect
            x="2.5"
            y="6"
            width="19"
            height="12"
            rx="2"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <circle cx="12" cy="12" r="2.6" stroke="currentColor" stroke-width="1.6" />
        }
        @case ('movil') {
          <rect
            x="6.5"
            y="2.5"
            width="11"
            height="19"
            rx="2.5"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <path d="M10.5 18.5h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        }
        @case ('tarjeta') {
          <rect
            x="2.5"
            y="5"
            width="19"
            height="14"
            rx="2.5"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <path d="M2.5 9.5h19" stroke="currentColor" stroke-width="1.6" />
          <path d="M6 14.5h3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        }
        @case ('banco') {
          <path
            d="M3.5 9.5 12 4l8.5 5.5"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path
            d="M5.5 10v7M12 10v7M18.5 10v7M3 20h18"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        }
        @default {
          <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6" />
        }
      }
    </svg>
  `,
})
export class IconoMedioComponent {
  readonly clave = input<string | undefined>(undefined)
}
