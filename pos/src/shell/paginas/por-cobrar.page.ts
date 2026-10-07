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
      detalle="Los tickets que un vendedor armó y otra persona cobra en caja. Es la única pantalla del POS que es una lista, y por eso no lleva la columna del ticket al lado: aquí se elige un ticket, no se construye. Se llena con PuertoTickets.porCobrar(sucursalId)."
    />
  `,
})
export class PorCobrarPage {}
