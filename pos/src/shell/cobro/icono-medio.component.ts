import { ChangeDetectionStrategy, Component, input } from '@angular/core'

/** Glifos de los medios de pago. Dibujados aquí para no traer una librería. */
@Component({
  selector: 'km-icono-medio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (clave()) {
        @case ('efectivo') {
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.6" />
        }
        @case ('movil') {
          <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
          <path d="M10.5 18.5h3" />
        }
        @case ('tarjeta') {
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M2.5 9.5h19" />
          <path d="M6 14.5h3.5" />
        }
        @case ('banco') {
          <path d="M3.5 9.5 12 4l8.5 5.5" />
          <path d="M5.5 10v7M12 10v7M18.5 10v7M3 20h18" />
        }
        @default {
          <circle cx="12" cy="12" r="8" />
        }
      }
    </svg>
  `,
})
export class IconoMedioComponent {
  readonly clave = input<string | undefined>(undefined)
}
