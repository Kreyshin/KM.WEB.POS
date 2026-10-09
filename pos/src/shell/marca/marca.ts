import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

/**
 * Marcas del producto y de la plataforma.
 *
 * Son tres y cada una dice algo distinto:
 *   - `km-logo-pos`     el producto. El cajón con el comprobante saliendo.
 *   - `km-logo-novum`   la plataforma Karma Novum, de la que el POS es una pieza.
 *   - `km-logo-karma`   la empresa, Karma Systems. Atribución, nada más.
 *
 * Los archivos viven en `public/marca/` y se sirven como estáticos en vez de
 * ir en línea en la plantilla: el del POS es un PNG de 47 kB, y en línea
 * entraría en el paquete de JavaScript y se descargaría aunque no se mire.
 * Así lo cachea el navegador y no pesa en el arranque de la caja.
 */

@Component({
  selector: 'km-logo-pos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center' },
  template: `
    <img
      [attr.src]="fuente()"
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      [attr.alt]="alt()"
      [style.width.px]="tamano()"
      class="h-auto select-none"
      draggable="false"
    />
  `,
})
export class LogoPosComponent {
  readonly tamano = input(96)
  readonly alt = input('Punto de venta')

  /**
   * El archivo pequeño mide 96 px de ancho, así que sirve hasta 48 px en
   * pantalla con holgura para el doble de densidad. Por encima de eso se pide
   * el de 320, o en un portátil retina el logo se ve blando.
   */
  protected readonly fuente = computed(() =>
    this.tamano() > 48 ? 'marca/pos-logo.png' : 'marca/pos-logo-sm.png',
  )
}

@Component({
  selector: 'km-logo-novum',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center' },
  template: `
    <img
      src="marca/karma-novum.svg"
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      [attr.alt]="alt()"
      class="select-none"
      draggable="false"
    />
  `,
})
export class LogoNovumComponent {
  readonly tamano = input(24)
  readonly alt = input('Karma Novum')
}

@Component({
  selector: 'km-logo-karma',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2' },
  template: `
    <img
      src="marca/karma-systems.svg"
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      alt=""
      class="select-none"
      draggable="false"
    />
    @if (conTexto()) {
      <span class="text-xs font-medium opacity-70">Un sistema Karma Systems</span>
    }
  `,
})
export class LogoKarmaComponent {
  readonly tamano = input(18)
  readonly conTexto = input(true)
}
