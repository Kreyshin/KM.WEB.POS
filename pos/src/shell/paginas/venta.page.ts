import { ChangeDetectionStrategy, Component } from '@angular/core'
import { PendienteComponent } from './pendiente.component'

@Component({
  selector: 'km-venta-page',
  imports: [PendienteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <km-pendiente
      hito="Hito 2 · Núcleo del ticket"
      titulo="Mostrador"
      detalle="Aquí va la pantalla de venta: a la izquierda la zona del perfil de rubro activo, a la derecha el carrito, los totales y la zona de cobro. La mitad derecha la pone pos-core-ui y es igual para todos los rubros; la izquierda la pone el perfil con su pantallaVenta."
    />
  `,
})
export class VentaPage {}
