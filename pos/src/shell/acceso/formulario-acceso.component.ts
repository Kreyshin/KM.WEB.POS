import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { SesionStore } from '../sesion/sesion.store'

/**
 * Entrada por usuario y clave.
 *
 * Es la vía secundaria: el turno habitual entra con el PIN del pad. Esta
 * queda para quien no tiene turno asignado —un supervisor que pasa, el
 * administrador— y vive plegada bajo el teclado.
 *
 * No hay campo de correo y no debe haberlo: en un mostrador el cajero no
 * tiene cuenta de correo de la empresa, y escribir una dirección con el
 * cliente esperando es fricción sin contrapartida.
 */
@Component({
  selector: 'km-formulario-acceso',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-col gap-3" (ngSubmit)="enviar()">
      <div class="flex flex-col gap-1.5">
        <label class="pv-etiqueta text-tenue" for="acceso-usuario">Usuario</label>
        <input
          id="acceso-usuario"
          class="pv-campo"
          type="text"
          name="usuario"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          required
          [(ngModel)]="usuario"
          [disabled]="sesion.cargando()"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="pv-etiqueta text-tenue" for="acceso-clave">Clave</label>
        <input
          id="acceso-clave"
          class="pv-campo"
          type="password"
          name="clave"
          autocomplete="current-password"
          required
          [(ngModel)]="clave"
          [disabled]="sesion.cargando()"
        />
      </div>

      <button
        class="pv-boton pv-boton-accion mt-1 w-full"
        type="submit"
        [disabled]="sesion.cargando()"
      >
        {{ sesion.cargando() ? 'Entrando…' : 'Iniciar sesión' }}
      </button>
    </form>
  `,
})
export class FormularioAccesoComponent {
  protected readonly sesion = inject(SesionStore)
  private readonly router = inject(Router)

  protected readonly usuario = signal('')
  protected readonly clave = signal('')

  protected async enviar(): Promise<void> {
    const ok = await this.sesion.iniciar(this.usuario(), this.clave())
    if (ok) await this.router.navigate(['/venta'])
  }
}
