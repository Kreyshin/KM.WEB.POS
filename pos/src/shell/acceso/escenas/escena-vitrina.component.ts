import { ChangeDetectionStrategy, Component } from '@angular/core'
import { NucleoAccesoComponent } from '../nucleo-acceso.component'
import { LogoKarmaComponent, LogoPosComponent } from '../../marca/marca'

/**
 * Variante B · Vitrina.
 *
 * Sin ilustración: el fondo es la escenografía. Tres manchas de luz que se
 * desplazan muy despacio y una tarjeta de vidrio flotando encima.
 *
 * Es la opción que mejor envejece de las tres, por dos razones prácticas:
 * no depende de un dibujo que haya que rehacer cuando cambie la marca, y
 * sirve igual a cualquier vertical de la suite cambiando los dos colores de
 * las manchas. Tampoco descarga ningún archivo: todo es CSS.
 *
 * El vidrio necesita `backdrop-filter`. Donde no exista, la tarjeta queda
 * opaca y legible igual; se pierde el efecto, no la pantalla.
 */
@Component({
  selector: 'km-escena-vitrina',
  imports: [NucleoAccesoComponent, LogoKarmaComponent, LogoPosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <div
      class="pv-vitrina relative flex min-h-full items-center justify-center overflow-hidden p-6"
    >
      <!-- Manchas de luz. Van detrás de todo y no reciben puntero. -->
      <div class="pv-mancha pv-mancha-1" aria-hidden="true"></div>
      <div class="pv-mancha pv-mancha-2" aria-hidden="true"></div>
      <div class="pv-mancha pv-mancha-3" aria-hidden="true"></div>

      <div class="pv-entra relative z-10 w-full max-w-sm">
        <div class="pv-vidrio p-7">
          <header class="mb-5 flex flex-col items-center text-center">
            <km-logo-pos [tamano]="72" />
            <h1 class="pv-titulo-pagina mt-3">Abrir turno</h1>
            <p class="text-tenue mt-1 text-sm">Elige tu turno y marca tu clave.</p>
          </header>

          <km-nucleo-acceso />
        </div>

        <p class="mt-4 flex justify-center opacity-60">
          <km-logo-karma />
        </p>
      </div>
    </div>
  `,
})
export class EscenaVitrinaComponent {}
