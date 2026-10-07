import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { TemaService, temas, type Tema } from '../tema/tema.service'
import { SesionStore } from '../sesion/sesion.store'

/**
 * Preferencias del puesto.
 *
 * Es la primera pantalla real del shell y existe desde el hito 1 porque el
 * tema es transversal: no depende de ningún rubro ni de ningún ticket.
 */
@Component({
  selector: 'km-ajustes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-fade-in mx-auto flex max-w-2xl flex-col gap-6">
      <section class="pv-panel p-6">
        <h1 class="pv-titulo-seccion mb-1">Tema</h1>
        <p class="text-tenue mb-5 text-sm">
          El punto de venta arranca en oscuro: la caja está en interior y la pantalla queda
          encendida toda la jornada. La elección se recuerda en este puesto.
        </p>
        <div class="flex gap-2" role="group" aria-label="Tema">
          @for (opcion of temas; track opcion) {
            <button
              class="pv-boton flex-1 capitalize"
              type="button"
              [class.pv-boton-accion]="tema.tema() === opcion"
              [class.pv-boton-tenue]="tema.tema() !== opcion"
              [attr.aria-pressed]="tema.tema() === opcion"
              (click)="tema.cambiar(opcion)"
            >
              {{ opcion }}
            </button>
          }
        </div>
      </section>

      <section class="pv-panel p-6">
        <h2 class="pv-titulo-seccion mb-4">Turno</h2>
        <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt class="pv-etiqueta text-tenue self-center">Usuario</dt>
          <dd>{{ usuario()?.nombre }}</dd>
          <dt class="pv-etiqueta text-tenue self-center">Rol</dt>
          <dd class="capitalize">{{ usuario()?.rol }}</dd>
          <dt class="pv-etiqueta text-tenue self-center">Sucursal</dt>
          <dd>{{ sucursal()?.nombre }}</dd>
          <dt class="pv-etiqueta text-tenue self-center">Perfil de rubro</dt>
          <dd>
            <span class="pv-chip-vertical pv-etiqueta rounded-control px-2 py-1">
              {{ perfilActivo() ?? 'sin perfil' }}
            </span>
          </dd>
        </dl>
        <p class="text-tenue mt-4 text-xs">
          El perfil lo fija la sucursal al iniciar sesión; no se elige desde la caja.
        </p>
      </section>
    </div>
  `,
})
export class AjustesPage {
  private readonly sesion = inject(SesionStore)

  protected readonly tema = inject(TemaService)
  protected readonly temas: readonly Tema[] = temas

  protected readonly usuario = this.sesion.usuario
  protected readonly sucursal = this.sesion.sucursal
  protected readonly perfilActivo = this.sesion.perfilActivo
}
