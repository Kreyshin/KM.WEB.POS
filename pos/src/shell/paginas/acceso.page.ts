import { ChangeDetectionStrategy, Component } from '@angular/core'
import { EscenaMostradorComponent } from '../acceso/escenas/escena-mostrador.component'

/**
 * Acceso al puesto.
 *
 * Una sola pantalla. Las variantes que se compararon —Vitrina y la comanda
 * suelta— se borraron al elegir esta; lo que queda de aquello es que la
 * comanda sobrevivió como envoltorio reutilizable en vez de como pantalla.
 */
@Component({
  selector: 'km-acceso-page',
  imports: [EscenaMostradorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<km-escena-mostrador class="h-full" />`,
})
export class AccesoPage {}
