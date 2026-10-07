import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AtajosDemoComponent, type CredencialAtajo } from './atajos-demo.component'
import { SesionStore } from '../sesion/sesion.store'

/**
 * El formulario de acceso, una sola vez.
 *
 * Las tres variantes ponen la escena; la autenticación vive aquí. Si mañana
 * hay que añadir un segundo factor o cambiar el mensaje de error, se cambia en
 * un archivo y las tres lo heredan.
 *
 * Los atajos de usuario de ejemplo solo se construyen en la demo: fuera de
 * ella `KM_DEMO` es falso y el bloque desaparece del paquete.
 */
@Component({
  selector: 'km-formulario-acceso',
  imports: [FormsModule, AtajosDemoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-col gap-4" (ngSubmit)="enviar()">
      <div class="flex flex-col gap-1.5">
        <label class="pv-etiqueta text-tenue" for="acceso-email">Correo</label>
        <input
          id="acceso-email"
          class="pv-campo"
          type="email"
          name="email"
          autocomplete="username"
          required
          [(ngModel)]="email"
          [disabled]="sesion.cargando()"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="pv-etiqueta text-tenue" for="acceso-clave">Contraseña</label>
        <input
          id="acceso-clave"
          class="pv-campo"
          type="password"
          name="password"
          autocomplete="current-password"
          required
          [(ngModel)]="password"
          [disabled]="sesion.cargando()"
        />
      </div>

      @if (sesion.error()) {
        <p
          class="pv-tono pv-tono-anulado pv-fade-in rounded-control px-3 py-2 text-sm"
          role="alert"
        >
          {{ sesion.error() }}
        </p>
      }

      <button class="pv-boton pv-boton-accion w-full" type="submit" [disabled]="sesion.cargando()">
        {{ sesion.cargando() ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    @defer (when demo) {
      <km-atajos-demo [ocupado]="sesion.cargando()" (elegido)="usar($event)" />
    }
  `,
})
export class FormularioAccesoComponent {
  protected readonly sesion = inject(SesionStore)
  private readonly router = inject(Router)

  protected readonly email = signal('')
  protected readonly password = signal('')

  protected readonly demo = KM_DEMO

  /**
   * Entrada por teclado numérico. La usa la variante «Teclado», que no tiene
   * campo de contraseña visible: el pad escribe aquí para que la
   * autenticación siga saliendo de un solo sitio.
   */
  agregarDigito(digito: string): void {
    this.password.update((actual) => actual + digito)
  }

  borrarDigito(): void {
    this.password.update((actual) => actual.slice(0, -1))
  }

  limpiarClave(): void {
    this.password.set('')
  }

  /** Largo de la clave escrita, para pintar los puntos del pad. */
  largoClave(): number {
    return this.password().length
  }

  fijarEmail(email: string): void {
    this.email.set(email)
  }

  enviarDesdePad(): Promise<void> {
    return this.enviar()
  }

  protected usar(credencial: CredencialAtajo): void {
    this.email.set(credencial.email)
    this.password.set(credencial.clave)
    void this.enviar()
  }

  protected async enviar(): Promise<void> {
    const ok = await this.sesion.iniciar(this.email(), this.password())
    if (ok) await this.router.navigate(['/venta'])
  }
}
