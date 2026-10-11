import { ChangeDetectionStrategy, Component } from '@angular/core'
import { NucleoAccesoComponent } from '../nucleo-acceso.component'
import { LogoKarmaComponent } from '../../marca/marca'

/**
 * Variante C · Comanda.
 *
 * El acceso ES el comprobante: papel con los bordes dentados, saliendo de la
 * impresora. Es la más propia del rubro de las tres, porque no ilustra un
 * mostrador: usa el objeto que el mostrador produce.
 *
 * Dos decisiones que conviene entender antes de elegirla:
 *
 *  1. La tarjeta va en PAPEL, claro, también en tema oscuro. Es deliberado y
 *     es la razón de que destaque. No rompe el sistema: el papel redefine los
 *     tokens `--pv-*` dentro de la tarjeta, así que el pad, el visor y el
 *     formulario se reciclan tal cual, sin saber que han cambiado de fondo.
 *  2. Los bordes dentados se recortan con máscara, y una máscara recorta
 *     también la sombra. La profundidad la pone una segunda capa detrás.
 */
@Component({
  selector: 'km-escena-comanda',
  imports: [NucleoAccesoComponent, LogoKarmaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <div
      class="pv-comanda-lienzo flex min-h-full items-start justify-center overflow-auto px-6 pb-16 pt-0"
    >
      <div class="pv-entra w-full max-w-sm">
        <!-- Cabezal de impresión del que sale el papel. -->
        <div class="pv-impresora" aria-hidden="true">
          <div class="pv-impresora-ranura"></div>
        </div>

        <div class="pv-comanda-sombra">
          <div class="pv-comanda px-7 pb-7 pt-8">
            <header class="mb-5 text-center">
              <p class="pv-comanda-marca">KARMA · PUNTO DE VENTA</p>
              <div class="pv-comanda-regla"></div>
              <h1 class="pv-titulo-pagina mt-3 text-2xl">Abrir turno</h1>
              <p class="mt-1 text-sm opacity-70">Elige tu turno y marca tu clave.</p>
              <div class="pv-comanda-regla mt-3"></div>
            </header>

            <km-nucleo-acceso />

            <div class="pv-comanda-regla mt-5"></div>
            <p class="pv-comanda-pie">*** ESTE COMPROBANTE NO TIENE VALOR TRIBUTARIO ***</p>
          </div>
        </div>

        <p class="mt-5 flex justify-center opacity-60">
          <km-logo-karma />
        </p>
      </div>
    </div>
  `,
})
export class EscenaComandaComponent {}
