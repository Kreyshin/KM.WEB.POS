import { ChangeDetectionStrategy, Component } from '@angular/core'
import { FormularioAccesoComponent } from './formulario-acceso.component'
import { KarmaLogoComponent } from '../marca/karma-logo.component'

/**
 * Variante «Mostrador»: el cajón de la caja, con una gaveta por turno.
 *
 * El equivalente del POS a la fachada del hotel: la escena dice de qué negocio
 * es el software antes de leer una palabra. Las gavetas son decorativas y van
 * marcadas como tal; el formulario flota encima, centrado.
 */
@Component({
  selector: 'km-acceso-mostrador',
  imports: [FormularioAccesoComponent, KarmaLogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-fondo-acceso relative flex h-full flex-col items-center justify-center p-6">
      <!-- El cajón: cuatro gavetas de monedas y billetes, puramente escenográficas. -->
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 flex h-1/3 items-end justify-center gap-3 px-6 opacity-40"
        aria-hidden="true"
      >
        @for (gaveta of gavetas; track gaveta) {
          <div
            class="w-full max-w-[9rem] rounded-t-overlay border border-linea border-b-0 bg-panel-2"
            [style.height.%]="gaveta"
          ></div>
        }
      </div>

      <div class="pv-panel pv-fade-in relative z-10 w-full max-w-sm p-8">
        <div class="pv-firma -mx-8 -mt-8 mb-8 rounded-t-card"></div>
        <div class="mb-8 flex items-center justify-between">
          <km-karma-logo [conTexto]="false" />
          <span class="pv-chip-vertical pv-etiqueta rounded-control px-2 py-1">Punto de venta</span>
        </div>
        <h2 class="pv-titulo-pagina mb-1">Abrir turno</h2>
        <p class="text-tenue mb-8 text-sm">La caja espera.</p>
        <km-formulario-acceso />
      </div>

      <p class="text-tenue relative z-10 mt-6 text-xs">Un sistema Karma Systems</p>
    </div>
  `,
})
export class AccesoMostradorComponent {
  protected readonly gavetas = [62, 84, 72, 54]
}
