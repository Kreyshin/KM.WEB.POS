import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { SesionStore } from '../sesion/sesion.store'
import { FormularioAccesoComponent } from './formulario-acceso.component'
import { TurnosComponent } from './turnos.component'

/**
 * El acceso, sin escenografía.
 *
 * Dos vías excluyentes, no una desplegada bajo la otra:
 *   - PIN: el turno del día. Se elige quién eres y se marca con el pulgar.
 *   - Usuario y clave: quien entra fuera de turno, un supervisor que pasa.
 *
 * Se conmutan: la que no está en uso se oculta y queda inerte, para que el
 * tabulador y el lector de pantalla no la encuentren. El cambio no es un
 * corte: los dos paneles animan a la vez `grid-template-rows` entre 0fr y
 * 1fr, así que la comanda crece o encoge en lugar de dar un salto.
 *
 * Contiene todo lo necesario para entrar y nada de cómo se ve la pantalla
 * alrededor. La escena solo pone el decorado, y la autenticación vive aquí:
 * si mañana hay un segundo factor, se toca este archivo y nada más.
 */
const LARGO_PIN = 4

type Modo = 'pin' | 'clave'

@Component({
  selector: 'km-nucleo-acceso',
  imports: [FormularioAccesoComponent, TurnosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'tecla($event)' },
  template: `
    <div class="flex flex-col">
      <div class="pv-conmuta" [class.pv-conmuta-clave]="modo() === 'clave'">
        <!-- Vía 1: PIN del turno -->
        <div class="pv-conmuta-panel" [attr.inert]="modo() === 'clave' ? '' : null">
          <div class="overflow-hidden">
            @defer (when demo) {
              <div class="mb-5">
                <km-turnos [elegido]="turno()" (elegir)="elegirTurno($event)" />
              </div>
            }

            <div
              class="mb-4 flex min-h-toque items-center justify-center gap-2.5 rounded-control border border-linea bg-panel-2"
              [class.pv-sacude]="sacude()"
              role="status"
              [attr.aria-label]="
                turno() ? 'Dígitos marcados: ' + marcados() : 'Elige un turno antes de marcar'
              "
            >
              @if (turno()) {
                @for (punto of ranura; track $index) {
                  <span
                    class="pv-punto"
                    [class.pv-punto-lleno]="$index < marcados()"
                    aria-hidden="true"
                  ></span>
                }
              } @else {
                <span class="text-tenue text-sm">Elige tu turno</span>
              }
            </div>

            <div class="grid grid-cols-3 gap-2">
              @for (tecla of teclas; track tecla) {
                <button
                  class="pv-tecla-pad pv-cifra"
                  type="button"
                  [disabled]="!listoParaMarcar()"
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
                [disabled]="!listoParaMarcar()"
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
          </div>
        </div>

        <!-- Vía 2: usuario y clave -->
        <div class="pv-conmuta-panel" [attr.inert]="modo() === 'pin' ? '' : null">
          <div class="overflow-hidden">
            <km-formulario-acceso />
          </div>
        </div>
      </div>

      <!-- El error vive fuera de los dos paneles: lo produce cualquiera de
           las dos vías y no debe desaparecer al conmutar. -->
      @if (sesion.error()) {
        <p
          class="pv-tono pv-tono-anulado pv-entra mt-4 rounded-control px-3 py-2 text-center text-sm"
          role="alert"
        >
          {{ sesion.error() }}
        </p>
      }

      <div class="mt-5 border-t border-linea pt-3">
        <button
          class="flex w-full items-center justify-center gap-2 py-1 text-sm text-tenue"
          type="button"
          (click)="conmutar()"
        >
          <span>{{ modo() === 'pin' ? 'Entrar con usuario y clave' : 'Volver al teclado' }}</span>
          <span class="pv-flecha" [class.pv-flecha-vuelta]="modo() === 'clave'">→</span>
        </button>
      </div>
    </div>
  `,
})
export class NucleoAccesoComponent {
  protected readonly sesion = inject(SesionStore)
  private readonly router = inject(Router)

  protected readonly demo = KM_DEMO
  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  protected readonly ranura = Array.from({ length: LARGO_PIN })

  /**
   * Vía activa. Pública para que la escena ajuste el encabezado.
   *
   * Arranca en el pad solo si hay turnos que elegir. Hoy la lista viene de
   * los usuarios de ejemplo, así que fuera de la demo no hay ninguno y el pad
   * sería un callejón sin salida: se marcarían cuatro dígitos sin que exista
   * un turno al que asociarlos. En el hito 6, cuando los turnos vengan de un
   * puerto, esta condición pasa a ser «¿devolvió turnos la sucursal?».
   */
  readonly modo = signal<Modo>(KM_DEMO ? 'pin' : 'clave')
  readonly turno = signal<string | null>(null)
  readonly pin = signal('')
  /** Sacudida del visor cuando la clave no entra. Se apaga sola. */
  protected readonly sacude = signal(false)

  readonly marcados = computed(() => this.pin().length)

  /** El pad solo acepta dígitos cuando hay a quién atribuirlos. */
  protected readonly listoParaMarcar = computed(
    () => this.turno() !== null && !this.sesion.cargando(),
  )

  protected conmutar(): void {
    this.modo.update((actual) => (actual === 'pin' ? 'clave' : 'pin'))
    // Lo marcado en una vía no se arrastra a la otra.
    this.pin.set('')
    this.sesion.limpiarError()
  }

  protected elegirTurno(usuario: string): void {
    this.turno.set(usuario)
    this.pin.set('')
  }

  protected marcar(digito: string): void {
    if (!this.listoParaMarcar() || this.marcados() >= LARGO_PIN) return
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
    if (!usuario) {
      // Defensivo: con el pad inhabilitado no debería llegarse aquí, pero
      // callar sería peor que avisar. Antes esto era un `return` mudo y
      // dejaba la pantalla sin responder ni explicar por qué.
      this.sesion.fijarError('Elige tu turno antes de marcar la clave.')
      return
    }
    if (this.marcados() === 0) return

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
    if (this.modo() !== 'pin' || evento.ctrlKey || evento.metaKey || evento.altKey) return

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
