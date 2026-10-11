import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { NucleoAccesoComponent } from '../nucleo-acceso.component'
import { ComandaComponent } from '../comanda.component'
import { RelojPuestoComponent } from '../reloj-puesto.component'
import { LogoKarmaComponent, LogoPosComponent } from '../../marca/marca'

/**
 * Pantalla de acceso.
 *
 * Pantalla partida: el puesto a la izquierda, el acceso a la derecha impreso
 * en una comanda.
 *
 * La mitad izquierda NO es decoración con una ilustración centrada en el
 * vacío. Es la ficha del puesto: la escena apoya en el suelo del panel y
 * debajo va la banda de identificación —sucursal, terminal, fecha y enlace—,
 * que es lo que un cajero comprueba antes de marcar. Así el espacio informa
 * en vez de sobrar, y la pantalla se parece a un equipo y no a una portada.
 *
 * Por debajo de 1024 px la escena desaparece y queda una sola columna: la
 * ilustración mide 800 px y comprimida a 360 no se lee. La marca y la banda
 * reaparecen entonces en la columna, para no perder la identificación.
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
    <div class="pv-acceso-lienzo grid h-full lg:grid-cols-[1.12fr_minmax(27rem,0.88fr)]">
      <!-- Puesto -->
      <section class="pv-puesto relative hidden overflow-hidden lg:grid">
        <div class="relative z-20 flex items-center gap-3 p-10 pb-0">
          <km-logo-pos [tamano]="38" alt="" />
          <div>
            <p class="pv-etiqueta text-primario-texto">Punto de venta</p>
            <p class="text-sm font-semibold">Karma Novum</p>
          </div>
        </div>

        <!--
          La escena apoya abajo y se sale por los lados en vez de flotar
          centrada: así tiene suelo y escala, y el panel deja de leerse como
          un hueco con un dibujo pequeño en medio.
        -->
        <div class="pv-escena-suelo relative z-10 self-end">
          <img
            class="pv-escena-img block w-full max-w-none select-none"
            [style.--pv-px]="px()"
            [style.--pv-py]="py()"
            src="marca/escenas/mostrador.svg"
            alt=""
            draggable="false"
          />
        </div>

        <!-- Ficha del puesto. Lo que se comprueba antes de marcar. -->
        <div class="pv-ficha relative z-20 self-end">
          <div class="pv-ficha-dato">
            <dt>Sucursal</dt>
            <dd>Botica San Isidro</dd>
          </div>
          <div class="pv-ficha-dato">
            <dt>Terminal</dt>
            <dd class="pv-cifra">POS-01</dd>
          </div>
          <div class="pv-ficha-dato">
            <dt>Fecha y hora</dt>
            <dd><km-reloj-puesto class="pv-ficha-reloj" /></dd>
          </div>
          <div class="pv-ficha-dato">
            <dt>Enlace</dt>
            <dd class="flex items-center gap-1.5">
              <span class="pv-pulso"></span>
              En línea
            </dd>
          </div>
        </div>
      </section>

      <!-- Acceso, impreso en comanda -->
      <!--
        Centrado con márgenes automáticos y NO con items-center.
        Cuando la comanda es más alta que la ventana —en móvil, o en la vía
        de usuario y clave sobre una pantalla corta— items-center la recorta
        por arriba y por abajo, y no deja desplazarse hasta los extremos.
      -->
      <section class="pv-acceso-columna flex overflow-auto px-6 py-8">
        <div class="pv-entra m-auto w-full max-w-sm">
          <!-- En una columna la marca no tiene dónde vivir, así que vuelve aquí. -->
          <div class="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <km-logo-pos [tamano]="40" alt="" />
            <div>
              <p class="pv-etiqueta text-primario-texto">Punto de venta</p>
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

          <!-- La identificación del puesto también en una columna: sin la
               escena, aquí es lo único que dice dónde se está marcando. -->
          <div class="pv-ficha pv-ficha-columna lg:hidden">
            <div class="pv-ficha-dato">
              <dt>Sucursal</dt>
              <dd>Botica San Isidro</dd>
            </div>
            <div class="pv-ficha-dato">
              <dt>Terminal</dt>
              <dd class="pv-cifra">POS-01</dd>
            </div>
          </div>

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
