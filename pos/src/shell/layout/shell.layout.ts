import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { filter, map } from 'rxjs'
import { NavigationEnd } from '@angular/router'
import { SesionStore } from '../sesion/sesion.store'
import { TemaService } from '../tema/tema.service'
import { KarmaLogoComponent } from '../marca/karma-logo.component'
import { modulos, moduloDeRuta } from './navegacion'

/**
 * Estructura compartida con el resto de la suite: barra de módulos a la
 * izquierda, menú de secciones del módulo activo, y el área de trabajo.
 *
 * El shell es delgado por decisión: sabe quién entró, en qué sucursal está y
 * qué perfil de rubro toca cargar. Lo que se vende y cómo se cobra no es
 * asunto suyo.
 */
@Component({
  selector: 'km-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, KarmaLogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full">
      <!-- Barra de módulos. Lleva el carbón verdoso en ambos temas. -->
      <nav
        class="pv-rail flex w-rail shrink-0 flex-col items-center gap-1 py-4 text-rail-tinta"
        aria-label="Módulos"
      >
        <a class="mb-4" routerLink="/venta" aria-label="Inicio">
          <km-karma-logo [conTexto]="false" [tamano]="28" />
        </a>

        @for (modulo of modulos; track modulo.codigo) {
          <a
            class="flex w-16 flex-col items-center gap-1 rounded-control px-1 py-2 text-[10px] font-semibold tracking-wide transition-colors"
            [routerLink]="modulo.secciones[0].ruta"
            [class.bg-accion]="moduloActivo()?.codigo === modulo.codigo"
            [class.text-rail-tenue]="moduloActivo()?.codigo !== modulo.codigo"
            [attr.aria-current]="moduloActivo()?.codigo === modulo.codigo ? 'page' : null"
          >
            <span class="text-lg leading-none" aria-hidden="true">{{ modulo.glifo }}</span>
            {{ modulo.titulo }}
          </a>
        }

        <div class="mt-auto flex flex-col items-center gap-2">
          <button
            class="rounded-control px-2 py-1 text-lg text-rail-tenue"
            type="button"
            [attr.aria-label]="
              tema.tema() === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
            "
            (click)="tema.alternar()"
          >
            {{ tema.tema() === 'oscuro' ? '☀' : '☾' }}
          </button>
        </div>
      </nav>

      <!-- Menú de secciones del módulo activo. -->
      @if (secciones().length > 0) {
        <aside
          class="hidden w-menu shrink-0 flex-col border-r border-linea bg-panel p-4 lg:flex"
          aria-label="Secciones"
        >
          <p class="pv-etiqueta text-tenue mb-3 px-2">{{ moduloActivo()?.titulo }}</p>
          <ul class="flex flex-col gap-0.5">
            @for (seccion of secciones(); track seccion.ruta) {
              <li>
                <a
                  class="flex min-h-toque items-center rounded-control px-3 text-sm"
                  [routerLink]="seccion.ruta"
                  routerLinkActive="bg-seleccion font-semibold text-jade-texto"
                  [routerLinkActiveOptions]="{ exact: true }"
                  >{{ seccion.titulo }}</a
                >
              </li>
            }
          </ul>
        </aside>
      }

      <!-- Área de trabajo. -->
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="pv-firma"></div>
        <header class="pv-cabecera flex items-center gap-4 border-b border-linea px-6 py-3">
          <div class="min-w-0 flex-1">
            <p class="pv-etiqueta text-tenue">{{ sucursal()?.nombre }}</p>
            <p class="truncate text-sm font-semibold">{{ moduloActivo()?.titulo }}</p>
          </div>

          <span class="pv-chip-vertical pv-etiqueta rounded-control px-2 py-1">
            {{ perfilActivo() ?? 'sin perfil' }}
          </span>

          <div class="relative">
            <button
              class="pv-boton pv-boton-tenue px-3 text-sm"
              type="button"
              [attr.aria-expanded]="menuAbierto()"
              aria-haspopup="menu"
              (click)="menuAbierto.set(!menuAbierto())"
            >
              {{ usuario()?.nombre }}
              <span class="text-tenue text-xs">{{ usuario()?.rol }}</span>
            </button>

            @if (menuAbierto()) {
              <div
                class="pv-panel pv-fade-in absolute right-0 top-full z-50 mt-2 w-48 p-1 shadow-flotante"
                role="menu"
              >
                <button
                  class="pv-boton pv-boton-tenue w-full justify-start border-0 text-sm"
                  type="button"
                  role="menuitem"
                  (click)="salir()"
                >
                  Cerrar turno
                </button>
              </div>
            }
          </div>
        </header>

        <main class="pv-fondo-vertical min-h-0 flex-1 overflow-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellLayout {
  private readonly router = inject(Router)
  private readonly sesion = inject(SesionStore)

  protected readonly tema = inject(TemaService)
  protected readonly modulos = modulos
  protected readonly menuAbierto = signal(false)

  protected readonly usuario = this.sesion.usuario
  protected readonly sucursal = this.sesion.sucursal
  protected readonly perfilActivo = this.sesion.perfilActivo

  /** Ruta actual, para resaltar el módulo. Arranca con la URL ya cargada. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  )

  protected readonly moduloActivo = computed(() => moduloDeRuta(this.url()))

  protected readonly secciones = computed(() => {
    const modulo = this.moduloActivo()
    if (!modulo) return []
    // El menú solo ofrece lo que el rol puede abrir.
    return modulo.secciones.filter((seccion) => this.sesion.puede(seccion.roles))
  })

  protected async salir(): Promise<void> {
    this.menuAbierto.set(false)
    await this.sesion.cerrar()
    await this.router.navigate(['/acceso'])
  }
}
