import { ChangeDetectionStrategy, Component } from '@angular/core'
import { PendienteComponent } from './pendiente.component'

@Component({
  selector: 'km-caja-page',
  imports: [PendienteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <km-pendiente
      hito="Hito 5 · Cobro"
      titulo="Sesión de caja"
      detalle="El panel de cobro y la apertura y cierre de caja NO se construyen en este repo: vienen de KARMA.LIB.CAJA. Aquí solo queda el hueco con forma definida, que es el puerto PuertoCobro. Mientras la librería no exista, detrás hay un diálogo simulado."
    />
  `,
})
export class CajaPage {}
