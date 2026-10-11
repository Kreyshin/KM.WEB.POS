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
import { CajaService, TicketService } from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'
import { PerfilService } from '../perfiles/perfil.service'
import { TemaService } from '../tema/tema.service'
import { LogoPosComponent } from '../marca/marca'
import { ColumnaTicketComponent } from './columna-ticket.component'
import { IconoModuloComponent } from './icono-modulo.component'
import { modulos, moduloDeRuta, moduloDeTecla } from './navegacion'
import { AtajosComponent } from './atajos.component'

/**
 * Estructura del sistema.
 *
 *   ┌────┬───────────────────────────────────┬──────────┐
 *   │ r  │ cabecera: módulo · sucursal · caja │          │
 *   │ a  ├───────────────────────────────────┤  TICKET  │
 *   │ i  │                                   │  (solo   │
 *   │ l  │          área de trabajo          │  en      │
 *   │    │                                   │  venta)  │
 *   └────┴───────────────────────────────────┴──────────┘
 *
 * La barra lateral existe aunque el cajero casi no navegue, y es un cambio
 * sobre la versión anterior. El motivo no es de uso sino de producto: esto
 * se vende como un sistema de gestión, y un sistema que enseña una sola
 * pantalla parece una sola pantalla. Los módulos que aún no existen se ven
 * apagados; esconderlos haría parecer el producto más pequeño de lo que es.
 *
 * Mide 76px: cabe el glifo y su nombre, y no se come la zona de venta.
 *
 * Los atajos NO usan teclas de función. F1 abre la ayuda del navegador, F3
 * la búsqueda, F5 recarga, F12 las herramientas: son suyas, no nuestras. Se
 * usa Alt+número para los módulos, «/» para buscar y Alt+C para cobrar, que
 * ningún navegador reclama.
 */
@Component({
  selector: 'km-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LogoPosComponent,
    ColumnaTicketComponent,
    IconoModuloComponent,
    AtajosComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full bg-lienzo">
      <!-- Barra de módulos -->
      <nav
        class="flex w-rail shrink-0 flex-col items-center gap-1 bg-rail py-3 text-rail-tinta"
        aria-label="Módulos"
      >
        <a class="pv-marca-barra mb-2" routerLink="/venta" aria-label="Mostrador">
          <km-logo-pos [tamano]="34" alt="" />
        </a>

        @for (modulo of modulosVisibles(); track modulo.ruta) {
          @if (modulo.pendiente) {
            <span
              class="pv-modulo pv-modulo-pendiente"
              [title]="modulo.titulo + ' · en construcción'"
            >
              <km-icono-modulo [clave]="modulo.icono" />
              <span class="pv-modulo-nombre">{{ modulo.titulo }}</span>
            </span>
          } @else {
            <a
              class="pv-modulo"
              [routerLink]="modulo.ruta"
              routerLinkActive="pv-modulo-activo"
              [routerLinkActiveOptions]="{ exact: true }"
              [title]="modulo.titulo + ' · Alt+' + modulo.tecla"
            >
              <km-icono-modulo [clave]="modulo.icono" />
              <span class="pv-modulo-nombre">{{ modulo.titulo }}</span>
            </a>
          }
        }

        <button
          class="pv-modulo mt-auto"
          type="button"
          [title]="tema.tema() === 'oscuro' ? 'Tema claro' : 'Tema oscuro'"
          (click)="tema.alternar()"
        >
          <span class="text-lg leading-none" aria-hidden="true">
            {{ tema.tema() === 'oscuro' ? '☀' : '☾' }}
          </span>
          <span class="pv-modulo-nombre">Tema</span>
        </button>
      </nav>

      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Cabecera: dónde estoy, dónde trabajo, cómo está la caja, quién soy -->
        <header
          class="flex h-barra shrink-0 items-center gap-4 border-b border-linea bg-panel px-5"
          aria-label="Barra del puesto"
        >
          <div class="min-w-0">
            <h1 class="truncate text-sm font-semibold">{{ moduloActivo()?.titulo }}</h1>
            <p class="text-tenue truncate text-xs">{{ sucursal()?.nombre }}</p>
          </div>

          <div class="ml-auto flex items-center gap-3">
            <span class="pv-estado" [class.pv-estado-activo]="cajaAbierta()">
              <span class="pv-pulso" [class.pv-pulso-apagado]="!cajaAbierta()"></span>
              {{ cajaAbierta() ? 'Caja abierta' : 'Caja cerrada' }}
            </span>

            <span class="pv-chip-vertical pv-etiqueta rounded-control px-2 py-1">
              {{ perfilActivo() ?? 'sin perfil' }}
            </span>

            <button
              class="pv-boton pv-boton-tenue h-9 min-h-0 px-3 text-sm"
              type="button"
              (click)="atajos.set(true)"
              title="Atajos de teclado"
            >
              ?
            </button>

            <div class="relative">
              <button
                class="pv-usuario"
                type="button"
                [attr.aria-expanded]="menuAbierto()"
                aria-haspopup="menu"
                (click)="menuAbierto.set(!menuAbierto())"
              >
                <span class="pv-avatar">{{ iniciales() }}</span>
                <span class="hidden text-sm font-medium sm:inline">{{ usuario()?.nombre }}</span>
              </button>

              @if (menuAbierto()) {
                <div
                  class="pv-panel pv-fade-in absolute right-0 top-full z-50 mt-2 w-56 p-1 shadow-flotante"
                  role="menu"
                >
                  <p class="text-tenue border-b border-linea px-3 py-2 text-xs capitalize">
                    {{ usuario()?.rol }} · {{ sucursal()?.nombre }}
                  </p>
                  <button
                    class="pv-boton pv-boton-tenue mt-1 w-full justify-start border-0 text-sm"
                    type="button"
                    role="menuitem"
                    (click)="salir()"
                  >
                    Cerrar turno
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <div class="flex min-h-0 flex-1">
          <main class="min-w-0 flex-1 overflow-auto p-5">
            <router-outlet />
          </main>

          @if (conTicket()) {
            <km-columna-ticket />
          }
        </div>
      </div>
    </div>

    @if (atajos()) {
      <km-atajos (cerrar)="atajos.set(false)" />
    }
  `,
})
export class ShellLayout {
  private readonly router = inject(Router)
  private readonly sesion = inject(SesionStore)
  private readonly ticket = inject(TicketService)
  private readonly caja = inject(CajaService)
  private readonly perfilRubro = inject(PerfilService)

  protected readonly tema = inject(TemaService)
  protected readonly menuAbierto = signal(false)
  protected readonly atajos = signal(false)

  protected readonly usuario = this.sesion.usuario
  protected readonly sucursal = this.sesion.sucursal
  protected readonly perfilActivo = this.sesion.perfilActivo

  protected readonly iniciales = computed(() =>
    (this.usuario()?.nombre ?? '')
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte[0] ?? '')
      .join('')
      .toUpperCase(),
  )

  /**
   * Estado de la caja, lo primero que mira un cajero al llegar.
   *
   * Vive en `CajaService` y no aquí porque la cabecera, la pantalla de caja
   * y el cobro tienen que ver lo mismo: dos fuentes para este dato acaban en
   * una cabecera que dice «abierta» sobre una caja que ya se cerró.
   */
  protected readonly cajaAbierta = this.caja.abierta

  constructor() {
    /*
     * El mostrador se abre aquí y no en el servicio porque el store necesita
     * sucursal y perfil, que los trae la sesión; y `pos-core-ui` no puede
     * importar el shell, que es donde vive la sesión. El shell, que conoce a
     * los dos, hace de puente.
     */
    const sucursal = this.sesion.sucursal()
    if (sucursal) {
      this.ticket.abrir({
        sucursalId: sucursal.id,
        perfil: sucursal.perfil,
        nuevoId: () => crypto.randomUUID(),
      })
    }

    // La caja se carga al entrar al shell y no al abrir su pantalla: la
    // píldora de la cabecera tiene que decir la verdad desde el primer
    // segundo, y el panel de cobro necesita saber si hay turno abierto
    // aunque el cajero nunca pase por Caja.
    const usuario = this.sesion.usuario()
    if (sucursal && usuario) void this.caja.cargar(sucursal.id, usuario.id)

    // El perfil del rubro se carga aquí, con la sucursal ya resuelta: es
    // quien aporta las marcas y las validaciones, y la pantalla de venta
    // lo necesita desde el primer producto que pinta.
    void this.perfilRubro.cargar()
  }

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  )

  /** Los pendientes se ven; los que el rol no abre, no. */
  protected readonly modulosVisibles = computed(() =>
    modulos.filter((modulo) => this.sesion.puede(modulo.roles)),
  )

  protected readonly moduloActivo = computed(() => moduloDeRuta(this.url()))
  protected readonly conTicket = computed(() => this.moduloActivo()?.conTicket === true)

  /**
   * Atajos.
   *
   * Alt+número para los módulos: las teclas de función son del navegador y
   * pelearse con ellas es perder. Se capturan en el documento porque el foco
   * puede estar en cualquier sitio cuando el cajero las pulsa.
   */
  @HostListener('document:keydown', ['$event'])
  protected atajo(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      this.menuAbierto.set(false)
      this.atajos.set(false)
      return
    }

    if (evento.key === '?' && !this.enCampo(evento)) {
      evento.preventDefault()
      this.atajos.set(true)
      return
    }

    if (!evento.altKey || evento.ctrlKey || evento.metaKey) return

    const modulo = moduloDeTecla(evento.key)
    if (!modulo || modulo.pendiente || !this.sesion.puede(modulo.roles)) return

    evento.preventDefault()
    void this.router.navigate([modulo.ruta])
  }

  private enCampo(evento: KeyboardEvent): boolean {
    const destino = evento.target as HTMLElement | null
    return destino?.matches('input, textarea, select') === true
  }

  protected async salir(): Promise<void> {
    this.menuAbierto.set(false)
    // Un ticket a medias no sobrevive al cambio de turno: lo que vendió el
    // cajero anterior no puede acabar cobrado a nombre del siguiente.
    this.ticket.cerrar()
    this.caja.limpiar()
    this.perfilRubro.limpiar()
    await this.sesion.cerrar()
    await this.router.navigate(['/acceso'])
  }
}
