import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { NucleoAccesoComponent } from '../nucleo-acceso.component'
import { ComandaComponent } from '../comanda.component'
import { RelojPuestoComponent } from '../reloj-puesto.component'
import { LogoKarmaComponent, LogoPosComponent } from '../../marca/marca'

/**
 * Pantalla de acceso.
 *
 * Pantalla partida: la escena del local a la izquierda y el acceso a la
 * derecha, impreso en una comanda que sale de la impresora.
 *
 * La comanda no es un adorno: es el objeto que el mostrador produce, así que
 * la primera pantalla del día ya dice de qué va el sistema. Y como es un
 * envoltorio reutilizable, el mismo papel vuelve en el detalle de una venta y
 * en el arqueo de caja.
 *
 * Por debajo de 1024 px la escena desaparece y queda una sola columna: la
 * ilustración mide 800 px y comprimida a 360 no se lee, además de empujar el
 * pad fuera de vista. La cabecera de marca que vive en la escena reaparece
 * entonces sobre la comanda, para que el producto siga presentándose.
 */
@Component({
  selector: 'km-escena-mostrador',
  imports: [
    NucleoAccesoComponent,
    ComandaComponent,
    RelojPuestoComponent,
    LogoKarmaComponent,
    LogoPosComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full', '(pointermove)': 'mover($event)', '(pointerleave)': 'centrar()' },
  template: `
    <div class="pv-acceso-lienzo grid h-full lg:grid-cols-[1.08fr_minmax(26rem,0.92fr)]">
      <!-- Escena -->
      <section class="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <div class="relative z-10 flex items-center gap-3">
          <km-logo-pos [tamano]="38" alt="" />
          <div>
            <p class="pv-etiqueta text-bronce-texto">Punto de venta</p>
            <p class="text-sm font-semibold">Karma Novum</p>
          </div>
        </div>

        <img
          class="pv-escena-img pointer-events-none absolute inset-0 m-auto max-h-[64vh] w-[min(94%,52rem)] object-contain select-none"
          [style.--pv-px]="px()"
          [style.--pv-py]="py()"
          src="marca/escenas/mostrador.svg"
          alt=""
          draggable="false"
        />

        <div class="relative z-10 flex items-end justify-between gap-8">
          <h2 class="pv-titulo-pagina max-w-sm text-3xl leading-tight">
            El mostrador, en una sola pantalla.
          </h2>
          <km-reloj-puesto class="shrink-0 text-right" />
        </div>
      </section>

      <!-- Acceso, impreso en comanda -->
      <!--
        Centrado con márgenes automáticos y NO con items-center.
        Cuando la comanda es más alta que la ventana —en móvil, o en la vía
        de usuario y clave sobre una pantalla corta— items-center la recorta
        por arriba y por abajo, y no deja desplazarse hasta los extremos. Con
        margen automático, si no cabe se reparte a cero y la columna
        simplemente hace scroll.
      -->
      <section class="flex overflow-auto px-6 py-8">
        <div class="pv-entra m-auto w-full max-w-sm">
          <!-- En una columna la marca no tiene dónde vivir, así que vuelve aquí. -->
          <div class="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <km-logo-pos [tamano]="40" alt="" />
            <div>
              <p class="pv-etiqueta text-bronce-texto">Punto de venta</p>
              <p class="text-sm font-semibold">Karma Novum</p>
            </div>
          </div>

          <km-comanda
            titulo="Abrir turno"
            [bajada]="
              nucleo.modo() === 'pin'
                ? 'Elige tu turno y marca tu clave.'
                : 'Entra con tu usuario y tu clave.'
            "
            pie="*** TURNO NO INICIADO ***"
          >
            <km-nucleo-acceso #nucleo />
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
