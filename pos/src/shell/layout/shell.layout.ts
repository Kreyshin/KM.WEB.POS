import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core'
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { filter, map } from 'rxjs'
import { SesionStore } from '../sesion/sesion.store'
import { TemaService } from '../tema/tema.service'
import { KarmaLogoComponent } from '../marca/karma-logo.component'
import { ColumnaTicketComponent } from './columna-ticket.component'
import { destinoDeRuta, destinoDeTecla, destinos } from './navegacion'

/**
 * Estructura del punto de venta.
 *
 * Las otras verticales de la suite comparten barra de módulos + menú de
 * secciones + área de trabajo. Este shell NO la sigue, y esa es la decisión
 * de diseño de la vertical:
 *
 *   ┌──────────────────────────────────────────────┬─────────────┐
 *   │ barra fina: sucursal · destinos · caja · yo   │             │
 *   ├──────────────────────────────────────────────┤   TICKET    │
 *   │                                              │   (carbón,  │
 *   │  ZONA DE VENTA                               │    fija)    │
 *   │  la pone el perfil de rubro activo           │             │
 *   │                                              │   TOTAL     │
 *   │                                              │  [ COBRAR ] │
 *   └──────────────────────────────────────────────┴─────────────┘
 *
 * Por qué: el cajero no navega. Pasa la jornada en una sola pantalla, con las
 * manos en el teclado y el escáner, y lo que necesita ver sin buscarlo es el
 * ticket y el total. Dedicarle 92px de ancho permanente a una barra de módulos
 * que se usa cuatro veces al día, y esconder el total, es diseñar un
 * backoffice y llamarlo POS.
 *
 * De ahí salen las tres reglas de esta pantalla:
 *   1. La navegación es una barra de 44px, neutra y callada.
 *   2. La columna del ticket no se pliega y no comparte el scroll: el total
 *      está siempre en pantalla por largo que sea el ticket.
 *   3. Todo lo frecuente tiene tecla, y la enseña.
 */
@Component({
  selector: 'km-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, KarmaLogoComponent, ColumnaTicketComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-lienzo flex h-full flex-col">
      <!-- Barra superior. Identidad a la izquierda, destinos al centro,
           estado del turno a la derecha. Nada de color de marca. -->
      <header
        class="pv-barra flex h-barra shrink-0 items-center gap-4 px-3"
        aria-label="Barra del puesto"
      >
        <a class="shrink-0" routerLink="/venta" aria-label="Mostrador">
          <km-karma-logo [conTexto]="false" [tamano]="22" />
        </a>

        <div class="hidden min-w-0 shrink-0 md:block">
          <p class="pv-etiqueta truncate text-tenue">{{ sucursal()?.nombre }}</p>
        </div>

        <nav class="flex min-w-0 flex-1 items-center gap-1" aria-label="Destinos">
          @for (destino of destinosVisibles(); track destino.ruta) {
            <a
              class="flex min-h-9 items-center gap-2 rounded-control px-3 text-sm"
              [routerLink]="destino.ruta"
              routerLinkActive="bg-seleccion font-semibold text-bronce-texto"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              {{ destino.titulo }}
              <span class="pv-tecla hidden lg:inline-flex">{{ destino.tecla }}</span>
            </a>
          }
        </nav>

        <!-- Estado de la caja: un punto y una palabra. -->
        <div
          class="flex shrink-0 items-center gap-2"
          [title]="cajaAbierta() ? 'Caja abierta' : 'Caja cerrada'"
        >
          <span
            class="pv-pulso"
            [class.pv-pulso-cerrada]="!cajaAbierta()"
            aria-hidden="true"
          ></span>
          <span class="pv-etiqueta hidden text-tenue sm:inline">
            {{ cajaAbierta() ? 'Caja abierta' : 'Caja cerrada' }}
          </span>
        </div>

        <span class="pv-chip-vertical pv-etiqueta shrink-0 rounded-control px-2 py-1">
          {{ perfilActivo() ?? 'sin perfil' }}
        </span>

        <button
          class="shrink-0 rounded-control px-2 py-1 text-base text-tenue"
          type="button"
          [attr.aria-label]="
            tema.tema() === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
          "
          (click)="tema.alternar()"
        >
          {{ tema.tema() === 'oscuro' ? '☀' : '☾' }}
        </button>

        <div class="relative shrink-0">
          <button
            class="pv-boton pv-boton-tenue h-9 min-h-0 px-3 text-sm"
            type="button"
            [attr.aria-expanded]="menuAbierto()"
            aria-haspopup="menu"
            (click)="menuAbierto.set(!menuAbierto())"
          >
            {{ usuario()?.nombre }}
          </button>

          @if (menuAbierto()) {
            <div
              class="pv-panel pv-fade-in absolute right-0 top-full z-50 mt-2 w-52 p-1 shadow-flotante"
              role="menu"
            >
              <p class="px-3 py-2 text-xs text-tenue">
                {{ usuario()?.rol }} · {{ sucursal()?.nombre }}
              </p>
              <button
                class="pv-boton pv-boton-tenue w-full justify-between border-0 text-sm"
                type="button"
                role="menuitem"
                (click)="salir()"
              >
                <span>Cerrar turno</span>
                <span class="pv-tecla">Esc</span>
              </button>
            </div>
          }
        </div>
      </header>

      <div class="flex min-h-0 flex-1">
        <!-- Zona de venta. En el hito 3 la ocupa la pantalla del perfil. -->
        <main class="min-w-0 flex-1 overflow-auto p-5">
          <router-outlet />
        </main>

        @if (conTicket()) {
          <km-columna-ticket />
        }
      </div>
    </div>
  `,
})
export class ShellLayout {
  private readonly router = inject(Router)
  private readonly sesion = inject(SesionStore)

  protected readonly tema = inject(TemaService)
  protected readonly menuAbierto = signal(false)

  protected readonly usuario = this.sesion.usuario
  protected readonly sucursal = this.sesion.sucursal
  protected readonly perfilActivo = this.sesion.perfilActivo

  /**
   * Estado de la caja. Hoy es falso siempre porque detrás no hay nadie: lo
   * responderá `PuertoCobro.cajaAbierta()` cuando exista KARMA.LIB.CAJA, en
   * el hito 5. Se muestra desde ya porque es lo primero que un cajero mira al
   * llegar, y porque enseñar «cerrada» cuando no se sabe es más honesto que
   * enseñar «abierta».
   */
  protected readonly cajaAbierta = signal(false)

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  )

  /** Destinos que este rol puede abrir. La guarda cubre la URL directa. */
  protected readonly destinosVisibles = computed(() =>
    destinos.filter((destino) => this.sesion.puede(destino.roles)),
  )

  /** La columna del ticket solo acompaña a las pantallas de venta. */
  protected readonly conTicket = computed(() => destinoDeRuta(this.url())?.conTicket === true)

  /**
   * Teclas de navegación.
   *
   * Se capturan en el documento y no en un campo, porque el cajero puede
   * tener el foco en cualquier sitio cuando las pulsa. Las de un destino que
   * su rol no abre se ignoran en silencio: no se le avisa de una puerta que
   * no es suya.
   */
  @HostListener('document:keydown', ['$event'])
  protected atajo(evento: KeyboardEvent): void {
    if (evento.key === 'Escape' && this.menuAbierto()) {
      this.menuAbierto.set(false)
      return
    }

    const destino = destinoDeTecla(evento.key)
    if (!destino || !this.sesion.puede(destino.roles)) return

    evento.preventDefault()
    void this.router.navigate([destino.ruta])
  }

  protected async salir(): Promise<void> {
    this.menuAbierto.set(false)
    await this.sesion.cerrar()
    await this.router.navigate(['/acceso'])
  }
}
