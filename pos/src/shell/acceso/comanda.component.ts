import { ChangeDetectionStrategy, Component, input } from '@angular/core'

/**
 * Comanda: un envoltorio con forma de comprobante.
 *
 * Papel con los bordes dentados, saliendo de la impresora. Recibe cualquier
 * contenido, así que no es solo para el acceso: la usarán también el detalle
 * de una venta, la vista previa antes de imprimir y el arqueo de caja.
 *
 * Dos decisiones que conviene entender:
 *
 *  1. El papel va CLARO también en tema oscuro. Es lo que la hace destacar, y
 *     no rompe el sistema: redefine los tokens `--pv-*` dentro de la tarjeta,
 *     así que lo que se monte dentro —botones, campos, cifras— se recicla tal
 *     cual, sin saber que ha cambiado de soporte.
 *  2. Los bordes dentados se recortan con máscara, y una máscara recorta
 *     también la sombra. La profundidad la pone una capa de detrás.
 */
@Component({
  selector: 'km-comanda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (conImpresora()) {
      <div class="pv-impresora" aria-hidden="true">
        <div class="pv-impresora-ranura"></div>
      </div>
    }

    <div class="pv-comanda-sombra">
      <div class="pv-comanda px-7 pb-7 pt-8">
        @if (titulo()) {
          <header class="mb-5 text-center">
            <p class="pv-comanda-marca">{{ marca() }}</p>
            <div class="pv-comanda-regla"></div>
            <h1 class="pv-titulo-pagina mt-3 text-2xl">{{ titulo() }}</h1>
            @if (bajada()) {
              <p class="mt-1 text-sm opacity-70">{{ bajada() }}</p>
            }
            <div class="pv-comanda-regla mt-3"></div>
          </header>
        }

        <ng-content />

        @if (pie()) {
          <div class="pv-comanda-regla mt-5"></div>
          <p class="pv-comanda-pie">{{ pie() }}</p>
        }
      </div>
    </div>
  `,
})
export class ComandaComponent {
  readonly marca = input('KARMA · PUNTO DE VENTA')
  readonly titulo = input<string | null>(null)
  readonly bajada = input<string | null>(null)
  readonly pie = input<string | null>(null)
  readonly conImpresora = input(true)
}
