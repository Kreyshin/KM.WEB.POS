import { ChangeDetectionStrategy, Component, input } from '@angular/core'

/**
 * Glifos de la barra de módulos.
 *
 * Dibujados a mano y no tomados de una librería, por dos razones: pesan unos
 * bytes en vez de unos cientos de kilobytes, y comparten grosor de trazo con
 * el resto del sistema, que es lo que hace que una barra de iconos se vea
 * ordenada en lugar de reunida de sitios distintos.
 */
@Component({
  selector: 'km-icono-modulo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <svg
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (clave()) {
        @case ('mostrador') {
          <path d="M3 10h18M4 10V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3M5 10v9h14v-9" />
          <path d="M10 14h4" />
        }
        @case ('pendientes') {
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M15 3v4h4" />
          <path d="M9.5 13.5l1.8 1.8 3.4-3.6" />
        }
        @case ('caja') {
          <path d="M3 9.5 12 5l9 4.5v8L12 22l-9-4.5z" />
          <path d="M3 9.5 12 14l9-4.5M12 14v8" />
        }
        @case ('catalogo') {
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
          <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z" />
          <path d="M9 7.5h6" />
        }
        @case ('clientes') {
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.5a3.2 3.2 0 0 1 0 6.3M17.5 14.6A5.5 5.5 0 0 1 21 20" />
        }
        @case ('reportes') {
          <path d="M4 20h16" />
          <path d="M7 20v-7M12 20V5M17 20v-10" />
        }
        @case ('ajustes') {
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.87 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.95-1.14l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 3.5 14.5H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.14-2.95l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 10 3.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.95 1.14l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0 1.2 2.87H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.06z"
          />
        }
        @default {
          <circle cx="12" cy="12" r="8" />
        }
      }
    </svg>
  `,
})
export class IconoModuloComponent {
  readonly clave = input.required<string>()
  readonly tamano = input(21)
}
