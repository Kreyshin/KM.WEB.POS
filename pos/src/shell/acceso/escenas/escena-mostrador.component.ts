import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { NucleoAccesoComponent } from '../nucleo-acceso.component'
import { ComandaComponent } from '../comanda.component'
import { LogoKarmaComponent, LogoPosComponent } from '../../marca/marca'

/**
 * Pantalla de acceso.
 *
 * Pantalla partida: la escena del local a la izquierda y el acceso a la
 * derecha, impreso en una comanda que sale de la impresora.
 *
 * La comanda no es un adorno: es el objeto que el mostrador produce, así que
 * la primera pantalla del día ya dice de qué va el sistema. Y como es un
 * envoltorio reutilizable, el mismo papel vuelve después en el detalle de una
 * venta y en el arqueo de caja.
 *
 * La ilustración se mueve un poco con el puntero. Da profundidad a una imagen
 * plana y evita que la pantalla parezca congelada mientras alguien espera.
 * En móvil desaparece: 800 px comprimidos a 360 no se leen y empujan el pad
 * fuera de vista.
 */
@Component({
  selector: 'km-escena-mostrador',
  imports: [NucleoAccesoComponent, ComandaComponent, LogoKarmaComponent, LogoPosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full', '(pointermove)': 'mover($event)', '(pointerleave)': 'centrar()' },
  template: `
    <div class="pv-acceso-lienzo grid h-full lg:grid-cols-[1.1fr_minmax(26rem,0.9fr)]">
      <!-- Escena -->
      <section class="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <div class="relative z-10 flex items-center gap-3">
          <km-logo-pos [tamano]="36" alt="" />
          <div>
            <p class="pv-etiqueta text-bronce-texto">Punto de venta</p>
            <p class="text-sm font-semibold">Karma Novum</p>
          </div>
        </div>

        <img
          class="pv-escena-img pointer-events-none absolute inset-0 m-auto w-[min(92%,44rem)] select-none"
          [style.--pv-px]="px()"
          [style.--pv-py]="py()"
          src="marca/escenas/mostrador.svg"
          alt=""
          draggable="false"
        />

        <h2 class="pv-titulo-pagina relative z-10 max-w-md text-3xl leading-tight">
          El mostrador, en una sola pantalla.
        </h2>
      </section>

      <!-- Acceso, impreso en comanda -->
      <section class="flex items-start justify-center overflow-auto px-6 pb-10 pt-6">
        <div class="pv-entra w-full max-w-sm">
          <km-comanda
            titulo="Abrir turno"
            bajada="Elige tu turno y marca tu clave."
            pie="*** TURNO NO INICIADO ***"
          >
            <km-nucleo-acceso />
          </km-comanda>

          <p class="mt-5 flex justify-center opacity-60">
            <km-logo-karma />
          </p>
        </div>
      </section>
    </div>
  `,
})
export class EscenaMostradorComponent {
  protected readonly px = signal('0px')
  protected readonly py = signal('0px')

  protected mover(evento: PointerEvent): void {
    // Desplazamiento máximo de 10 px: lo justo para que la escena respire sin
    // que el movimiento llame la atención por encima del pad.
    const x = (evento.clientX / window.innerWidth - 0.5) * 20
    const y = (evento.clientY / window.innerHeight - 0.5) * 20
    this.px.set(`${x.toFixed(1)}px`)
    this.py.set(`${y.toFixed(1)}px`)
  }

  protected centrar(): void {
    this.px.set('0px')
    this.py.set('0px')
  }
}
