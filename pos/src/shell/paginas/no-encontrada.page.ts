import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'

@Component({
  selector: 'km-no-encontrada-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="pv-panel pv-fade-in mx-auto max-w-lg p-8 text-center">
      <p class="pv-cifra pv-cifra-total text-jade-texto mb-2">404</p>
      <h1 class="pv-titulo-pagina mb-3">Esa pantalla no existe</h1>
      <a class="pv-boton pv-boton-accion" routerLink="/venta">Volver al mostrador</a>
    </section>
  `,
})
export class NoEncontradaPage {}
