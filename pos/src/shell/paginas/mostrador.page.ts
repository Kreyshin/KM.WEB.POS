import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { PerfilService } from '../perfiles/perfil.service'
import { VentaPage } from './venta.page'

/**
 * El mostrador: la pantalla que el perfil puede reemplazar.
 *
 * Esta es la pieza que cierra el contrato del perfil. La ruta `/venta` no
 * apunta a una pantalla concreta sino aquí, y aquí se pregunta al perfil
 * si trae la suya:
 *
 *   farmacia  no trae  → se usa la genérica: rejilla, facetas y ficha
 *   ropa      sí trae  → matriz de talla y color
 *
 * Sin este cambio, `pantallaVenta` era una propiedad del contrato que
 * nadie leía: el perfil podía declararla y el shell seguía pintando
 * siempre lo mismo. Era la mitad del diseño que estaba escrita pero no
 * conectada.
 *
 * El componente del perfil llega por `NgComponentOutlet`, así que el
 * shell no lo importa nunca: sigue sin conocer un solo perfil por su
 * nombre, que es la regla que protege el lint.
 */
@Component({
  selector: 'km-mostrador-page',
  imports: [NgComponentOutlet, VentaPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    @if (pantallaDelPerfil(); as pantalla) {
      <ng-container *ngComponentOutlet="pantalla" />
    } @else {
      <km-venta-page />
    }
  `,
})
export class MostradorPage {
  private readonly perfil = inject(PerfilService)

  /**
   * Nula mientras el perfil carga, y nula también si no trae pantalla.
   *
   * Las dos caen en la genérica, y es lo correcto: un parpadeo de la
   * pantalla común es mejor que un hueco en blanco mientras llega el
   * trozo del perfil.
   */
  protected readonly pantallaDelPerfil = computed(() => this.perfil.perfil()?.pantallaVenta ?? null)
}
