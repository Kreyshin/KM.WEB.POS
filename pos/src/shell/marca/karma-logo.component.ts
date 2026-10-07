import { ChangeDetectionStrategy, Component, input } from '@angular/core'

/**
 * Isotipo de plataforma.
 *
 * Aparece como atribución («Un sistema Karma Systems») en el acceso y al pie
 * de la barra de módulos. Es lo único de la identidad violeta de plataforma
 * que sobrevive dentro del tema bronce de la vertical, y es a propósito: fija
 * que el POS es una pieza de la suite, no un producto suelto.
 */
@Component({
  selector: 'km-karma-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-2" [title]="texto()">
      <svg
        class="shrink-0"
        [attr.width]="tamano()"
        [attr.height]="tamano()"
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <defs>
          <linearGradient [attr.id]="gradiente" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#8a2be2" />
            <stop offset="100%" stop-color="#1a237e" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="30" height="30" rx="9" [attr.fill]="'url(#' + gradiente + ')'" />
        <path
          d="M11 8v16M11 16l8-8M11 16l9 8"
          stroke="#ffffff"
          stroke-width="2.4"
          stroke-linecap="round"
          fill="none"
        />
      </svg>
      @if (conTexto()) {
        <span class="text-xs font-medium opacity-80">{{ texto() }}</span>
      }
    </span>
  `,
})
export class KarmaLogoComponent {
  readonly tamano = input(20)
  readonly conTexto = input(true)
  readonly texto = input('Un sistema Karma Systems')

  /** Un id por instancia: dos logos en la misma página no deben compartir el degradado. */
  protected readonly gradiente = `km-logo-${Math.random().toString(36).slice(2, 9)}`
}
