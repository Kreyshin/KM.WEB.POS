import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { NucleoAccesoComponent } from '../nucleo-acceso.component'
import { LogoKarmaComponent, LogoPosComponent } from '../../marca/marca'

/**
 * Variante A · Mostrador.
 *
 * Pantalla partida: la escena del local a la izquierda, el acceso a la
 * derecha. Es la forma que usan los accesos con más presencia —una ilustración
 * que dice de qué negocio es el software antes de leer una palabra— y la que
 * mejor aprovecha una pantalla ancha de caja.
 *
 * La ilustración se mueve un poco con el puntero. No es un adorno: da
 * profundidad a una imagen plana y hace que la pantalla no parezca congelada
 * mientras alguien espera su turno.
 *
 * En móvil la escena desaparece y queda solo el acceso, porque una ilustración
 * de 760 px comprimida a 360 no se lee y además empuja el pad fuera de vista.
 */
@Component({
  selector: 'km-escena-mostrador',
  imports: [NucleoAccesoComponent, LogoKarmaComponent, LogoPosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full', '(pointermove)': 'mover($event)', '(pointerleave)': 'centrar()' },
  template: `
    <div class="grid h-full lg:grid-cols-[1.15fr_minmax(25rem,0.85fr)]">
      <!-- Escena -->
      <section
        class="pv-escena-lienzo relative hidden flex-col justify-between overflow-hidden p-10 lg:flex"
      >
        <div class="relative z-10 flex items-center gap-3">
          <km-logo-pos [tamano]="36" alt="" />
          <div>
            <p class="pv-etiqueta text-bronce-texto">Punto de venta</p>
            <p class="text-sm font-semibold">Karma Novum</p>
          </div>
        </div>

        <img
          class="pv-escena-img pointer-events-none absolute inset-0 m-auto w-[min(90%,42rem)] select-none"
          [style.--pv-px]="px()"
          [style.--pv-py]="py()"
          src="marca/escenas/mostrador.svg"
          alt=""
          draggable="false"
        />

        <div class="relative z-10 max-w-md">
          <h2 class="pv-titulo-pagina text-3xl leading-tight">
            El mostrador, en una sola pantalla.
          </h2>
          <p class="text-tenue mt-3 text-sm leading-relaxed">
            Un mismo ticket para todos los rubros. Lo que cambia de una tienda de ropa a una botica
            es el perfil que se carga, no la caja.
          </p>
        </div>
      </section>

      <!-- Acceso -->
      <section class="flex items-center justify-center overflow-auto bg-panel p-6 sm:p-10">
        <div class="pv-entra w-full max-w-sm">
          <div class="mb-6 lg:hidden">
            <km-logo-pos [tamano]="56" alt="" />
          </div>
          <h1 class="pv-titulo-pagina">Abrir turno</h1>
          <p class="text-tenue mb-6 mt-1 text-sm">Elige tu turno y marca tu clave.</p>
          <km-nucleo-acceso />
          <p class="mt-6 flex justify-center opacity-60">
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
