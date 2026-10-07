import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { SesionStore } from '../sesion/sesion.store'
import { perfilRegistrado } from '../perfiles/registro'

/**
 * Zona de venta.
 *
 * Es la mitad izquierda del mostrador: la barra de búsqueda y lo que el
 * perfil de rubro quiera poner debajo. La mitad derecha —ticket, totales y
 * cobro— la pone el shell y es igual para todos los rubros.
 *
 * El buscador vive aquí, y no dentro del perfil, porque el gesto es el mismo
 * en ropa y en farmacia: escanear o escribir. Lo que cambia por rubro es qué
 * se busca y cómo se muestran los resultados, y eso sí lo aporta el perfil a
 * través de `BuscadorProductos` y `pantallaVenta`.
 */
@Component({
  selector: 'km-venta-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-fade-in flex h-full flex-col gap-4">
      <!-- Barra de búsqueda. Es lo primero que recibe el foco al abrir el
           mostrador: en una caja se escribe antes de mirar. -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            class="pv-campo pr-16"
            type="search"
            placeholder="Escanea un código o escribe para buscar…"
            aria-label="Buscar producto"
            disabled
          />
          <span
            class="pv-tecla absolute right-3 top-1/2 -translate-y-1/2 text-tenue"
            aria-hidden="true"
            >F2</span
          >
        </div>
        <button class="pv-boton pv-boton-tenue" type="button" disabled>
          Cliente
          <span class="pv-tecla">F6</span>
        </button>
      </div>

      <!-- Resultados. Los pinta el perfil del rubro activo. -->
      <div
        class="pv-panel flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
      >
        @if (!hayPerfil()) {
          <p class="pv-etiqueta text-bronce-texto">Hito 3 · Perfil de rubro</p>
          <h1 class="pv-titulo-seccion">
            La sucursal usa el perfil «{{ perfil() ?? 'sin definir' }}», que aún no está registrado
          </h1>
          <p class="max-w-md text-sm text-tenue">
            Aquí va la pantalla de venta del rubro: tarjetas con foto y matriz de talla y color en
            ropa, lista densa y operable por teclado en farmacia. El shell solo reserva el espacio y
            carga el perfil de forma diferida.
          </p>
        }
      </div>
    </div>
  `,
})
export class VentaPage {
  private readonly sesion = inject(SesionStore)

  protected readonly perfil = this.sesion.perfilActivo

  protected hayPerfil(): boolean {
    return perfilRegistrado(this.perfil())
  }
}
