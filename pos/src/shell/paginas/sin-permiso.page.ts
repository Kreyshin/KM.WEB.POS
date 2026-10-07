import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'

@Component({
  selector: 'km-sin-permiso-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="pv-panel pv-fade-in mx-auto max-w-lg p-8 text-center">
      <p class="pv-etiqueta text-tenue mb-3">Acceso restringido</p>
      <h1 class="pv-titulo-pagina mb-3">Tu rol no abre esta pantalla</h1>
      <p class="text-tenue mb-6">Pide a un supervisor que la habilite para tu turno.</p>
      <a class="pv-boton pv-boton-accion" routerLink="/venta">Volver al mostrador</a>
    </section>
  `,
})
export class SinPermisoPage {}
