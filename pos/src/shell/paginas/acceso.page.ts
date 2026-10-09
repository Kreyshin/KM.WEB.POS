import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { SesionStore } from '../sesion/sesion.store'
import { FormularioAccesoComponent } from '../acceso/formulario-acceso.component'
import { AtajosDemoComponent, type TurnoDemo } from '../acceso/atajos-demo.component'
import { LogoKarmaComponent, LogoPosComponent } from '../marca/marca'

/**
 * Acceso al puesto.
 *
 * Una sola puesta en escena: el pad numérico. El turno se elige y la clave se
 * marca con el pulgar, que es como se abre una caja. Usuario y clave quedan
 * plegados debajo para quien entra desde fuera del turno.
 *
 * El teclado físico también marca: los dígitos escriben, Retroceso borra y
 * Entrar envía, sin que haya que poner el foco en ningún sitio.
 */
const LARGO_PIN = 4

@Component({
  selector: 'km-acceso-page',
  imports: [FormularioAccesoComponent, AtajosDemoComponent, LogoKarmaComponent, LogoPosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'tecla($event)' },
  template: `
    <div class="pv-fondo-acceso flex min-h-full items-center justify-center p-6">
      <div class="pv-entra w-full max-w-sm">
        <div class="pv-panel overflow-hidden p-6">
          <header class="mb-5 flex flex-col items-center text-center">
            <km-logo-pos class="pv-entra-marca" [tamano]="72" />
            <h1 class="pv-titulo-pagina mt-3">Abrir turno</h1>
            <p class="text-tenue mt-1 text-sm">
              {{ turno() ? 'Marca tu clave.' : 'Elige tu turno y marca tu clave.' }}
            </p>
          </header>

          @defer (when demo) {
            <div class="mb-5">
              <km-atajos-demo [elegido]="turno()" (elegir)="elegirTurno($event)" />
            </div>
          }

          <!-- Puntos de la clave marcada. -->
          <div
            class="mb-4 flex min-h-toque items-center justify-center gap-2.5 rounded-control border border-linea bg-panel-2"
            [class.pv-sacude]="sacude()"
            role="status"
            [attr.aria-label]="'Dígitos marcados: ' + marcados()"
          >
            @for (punto of ranura; track $index) {
              <span
                class="pv-punto"
                [class.pv-punto-lleno]="$index < marcados()"
                aria-hidden="true"
              ></span>
            }
          </div>

          @if (sesion.error()) {
            <p
              class="pv-tono pv-tono-anulado pv-entra mb-4 rounded-control px-3 py-2 text-center text-sm"
              role="alert"
            >
              {{ sesion.error() }}
            </p>
          }

          <div class="grid grid-cols-3 gap-2">
            @for (tecla of teclas; track tecla) {
              <button
                class="pv-tecla-pad pv-cifra"
                type="button"
                [disabled]="sesion.cargando()"
                (click)="marcar(tecla)"
              >
                {{ tecla }}
              </button>
            }
            <button
              class="pv-tecla-pad text-sm"
              type="button"
              [disabled]="sesion.cargando() || marcados() === 0"
              (click)="borrar()"
            >
              Borrar
            </button>
            <button
              class="pv-tecla-pad pv-cifra"
              type="button"
              [disabled]="sesion.cargando()"
              (click)="marcar('0')"
            >
              0
            </button>
            <button
              class="pv-tecla-pad pv-tecla-pad-accion text-sm"
              type="button"
              [disabled]="sesion.cargando() || marcados() === 0"
              (click)="entrar()"
            >
              {{ sesion.cargando() ? '…' : 'Entrar' }}
            </button>
          </div>

          <!-- Usuario y clave, plegado. Se anima el alto con grid, que es lo
               único que transiciona de 0 a «lo que mida» sin fijar píxeles. -->
          <div class="mt-5 border-t border-linea pt-3">
            <button
              class="flex w-full items-center justify-between py-1 text-sm text-tenue"
              type="button"
              [attr.aria-expanded]="conFormulario()"
              aria-controls="acceso-formulario"
              (click)="conFormulario.set(!conFormulario())"
            >
              <span>Entrar con usuario y clave</span>
              <span class="pv-chevron" [class.pv-chevron-abierto]="conFormulario()">⌃</span>
            </button>

            <div class="pv-plegable" [class.pv-plegable-abierto]="conFormulario()">
              <div class="overflow-hidden" id="acceso-formulario">
                <div class="pt-3">
                  <km-formulario-acceso />
                </div>
              </div>
            </div>
          </div>
        </div>

        <p class="mt-4 flex justify-center opacity-60">
          <km-logo-karma />
        </p>
      </div>
    </div>
  `,
})
export class AccesoPage {
  protected readonly sesion = inject(SesionStore)
  private readonly router = inject(Router)

  protected readonly demo = KM_DEMO
  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  protected readonly ranura = Array.from({ length: LARGO_PIN })

  protected readonly turno = signal<string | null>(null)
  protected readonly pin = signal('')
  protected readonly conFormulario = signal(false)
  /** Sacudida del visor cuando la clave no entra. Se apaga sola. */
  protected readonly sacude = signal(false)

  protected readonly marcados = computed(() => this.pin().length)

  protected elegirTurno(turno: TurnoDemo): void {
    this.turno.set(turno.usuario)
    this.pin.set('')
  }

  protected marcar(digito: string): void {
    if (this.marcados() >= LARGO_PIN) return
    this.pin.update((actual) => actual + digito)
    // Con el PIN completo se entra solo: en una caja nadie pulsa «Entrar»
    // después de marcar cuatro dígitos.
    if (this.marcados() === LARGO_PIN) void this.entrar()
  }

  protected borrar(): void {
    this.pin.update((actual) => actual.slice(0, -1))
  }

  protected async entrar(): Promise<void> {
    const usuario = this.turno()
    if (!usuario || this.marcados() === 0) return

    const ok = await this.sesion.iniciar(usuario, this.pin())
    if (ok) {
      await this.router.navigate(['/venta'])
      return
    }

    // Falló: se vacía el visor y se sacude, que es la respuesta que espera
    // quien marca sin mirar.
    this.pin.set('')
    this.sacude.set(true)
    setTimeout(() => this.sacude.set(false), 420)
  }

  /** El pad acepta también el teclado físico, sin foco en ningún campo. */
  protected tecla(evento: KeyboardEvent): void {
    if (this.conFormulario() || evento.ctrlKey || evento.metaKey || evento.altKey) return

    if (/^[0-9]$/.test(evento.key)) {
      evento.preventDefault()
      this.marcar(evento.key)
    } else if (evento.key === 'Backspace') {
      evento.preventDefault()
      this.borrar()
    } else if (evento.key === 'Enter') {
      evento.preventDefault()
      void this.entrar()
    }
  }
}
