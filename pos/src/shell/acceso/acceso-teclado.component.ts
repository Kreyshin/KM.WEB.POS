import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core'
import { FormularioAccesoComponent } from './formulario-acceso.component'
import { KarmaLogoComponent } from '../marca/karma-logo.component'
import { usuariosDemo } from '@pos-adaptadores/simulado/index'

/**
 * Variante «Teclado»: acceso por pad numérico, sin soltar el escáner.
 *
 * Es la variante pensada para la caja real: se elige el turno de una lista y
 * la clave se marca con el pulgar. El formulario completo sigue debajo,
 * plegado, porque un administrador que entra con correo también necesita
 * poder hacerlo desde aquí.
 *
 * El pad escribe en el mismo formulario que las otras dos variantes: la
 * autenticación no se duplica.
 */
@Component({
  selector: 'km-acceso-teclado',
  imports: [FormularioAccesoComponent, KarmaLogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-fondo-acceso flex h-full items-center justify-center p-6">
      <div class="pv-panel pv-fade-in w-full max-w-md p-8">
        <div class="mb-6 flex items-center justify-between">
          <km-karma-logo [conTexto]="false" />
          <span class="pv-chip-vertical pv-etiqueta rounded-control px-2 py-1">Punto de venta</span>
        </div>

        <h2 class="pv-titulo-pagina mb-1">Marcar clave</h2>
        <p class="text-tenue mb-6 text-sm">
          Elige tu turno y marca tu clave.
          @if (demo) {
            <span class="text-tenue">El PIN va junto a cada nombre.</span>
          }
        </p>

        @if (usuarios.length > 0) {
          <div class="mb-6 flex flex-wrap gap-2">
            @for (usuario of usuarios; track usuario.id) {
              <button
                class="pv-boton px-3 text-xs"
                type="button"
                [class.pv-boton-accion]="elegido() === usuario.email"
                [class.pv-boton-tenue]="elegido() !== usuario.email"
                [attr.aria-pressed]="elegido() === usuario.email"
                (click)="elegir(usuario.email)"
              >
                {{ usuario.nombre }}
                @if (demo) {
                  <span class="pv-cifra text-tenue">· {{ usuario.pin }}</span>
                }
              </button>
            }
          </div>
        }

        <!-- Puntos de la clave marcada. -->
        <div
          class="mb-5 flex min-h-toque items-center justify-center gap-2 rounded-control border border-linea bg-panel-2"
          role="status"
          [attr.aria-label]="'Dígitos marcados: ' + marcados()"
        >
          @if (marcados() === 0) {
            <span class="text-tenue text-sm">· · · ·</span>
          } @else {
            @for (punto of puntos(); track $index) {
              <span class="h-2.5 w-2.5 rounded-full bg-bronce"></span>
            }
          }
        </div>

        <div class="grid grid-cols-3 gap-2">
          @for (tecla of teclas; track tecla) {
            <button
              class="pv-boton pv-boton-tenue pv-cifra h-14 text-xl"
              type="button"
              (click)="marcar(tecla)"
            >
              {{ tecla }}
            </button>
          }
          <button class="pv-boton pv-boton-tenue h-14 text-sm" type="button" (click)="borrar()">
            Borrar
          </button>
          <button
            class="pv-boton pv-boton-tenue pv-cifra h-14 text-xl"
            type="button"
            (click)="marcar('0')"
          >
            0
          </button>
          <button class="pv-boton pv-boton-accion h-14 text-sm" type="button" (click)="entrar()">
            Entrar
          </button>
        </div>

        <details class="mt-6 border-t border-linea pt-4">
          <summary class="text-tenue cursor-pointer text-sm">
            Entrar con correo y contraseña
          </summary>
          <div class="mt-4">
            <km-formulario-acceso />
          </div>
        </details>
      </div>
    </div>
  `,
})
export class AccesoTecladoComponent {
  private readonly formulario = viewChild.required(FormularioAccesoComponent)

  /*
   * Lista de turnos. Hoy sale de los usuarios de ejemplo y solo en la demo;
   * en una caja real debe venir de un puerto (los cajeros asignados a la
   * sucursal), que es trabajo del hito 6. Hasta entonces, en producción la
   * lista queda vacía y se entra por el formulario de abajo.
   */
  protected readonly usuarios = KM_DEMO ? usuariosDemo : []
  protected readonly demo = KM_DEMO
  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  protected readonly elegido = signal<string | null>(null)
  protected readonly marcados = signal(0)
  protected readonly puntos = computed(() => Array.from({ length: this.marcados() }))

  protected elegir(email: string): void {
    this.elegido.set(email)
    this.formulario().fijarEmail(email)
  }

  protected marcar(digito: string): void {
    this.formulario().agregarDigito(digito)
    this.marcados.set(this.formulario().largoClave())
  }

  protected borrar(): void {
    this.formulario().borrarDigito()
    this.marcados.set(this.formulario().largoClave())
  }

  protected entrar(): void {
    void this.formulario().enviarDesdePad()
  }
}
