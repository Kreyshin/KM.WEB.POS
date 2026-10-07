import { ChangeDetectionStrategy, Component } from '@angular/core'
import { PendienteComponent } from './pendiente.component'

@Component({
  selector: 'km-por-cobrar-page',
  imports: [PendienteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <km-pendiente
      hito="Hito 2 · Núcleo del ticket"
      titulo="Pedidos por cobrar"
      detalle="La lista de tickets en estado «por cobrar»: lo que un vendedor armó y otra persona cobra en caja. Se llena con PuertoTickets.porCobrar(sucursalId)."
    />
  `,
})
export class PorCobrarPage {}
