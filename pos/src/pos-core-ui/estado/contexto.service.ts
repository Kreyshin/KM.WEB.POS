import { computed, Injectable, signal } from '@angular/core'
import type { SucursalRef } from '@pos-core/index'

/**
 * Dónde se está vendiendo.
 *
 * Existe porque lo descubrió el segundo perfil. La pantalla de venta de
 * ropa necesita la sucursal para pedir su catálogo, y un perfil NO puede
 * importar el shell —es la regla que sostiene toda la arquitectura—, así
 * que no tenía forma de saberlo. El primer intento fue pasar cadena vacía
 * y la tienda de ropa acabó vendiendo paracetamol.
 *
 * La alternativa habría sido pasarlo como `input` a la pantalla del
 * perfil, pero entonces el contrato obligaría a toda pantalla a declarar
 * ese input aunque no lo use, y el shell tendría que conocer su forma.
 *
 * Lo llena el shell al arrancar, igual que abre el mostrador. Vive en
 * `pos-core-ui` porque es justo lo que esta capa es: lo que el núcleo y
 * los perfiles comparten sin conocerse.
 */
@Injectable({ providedIn: 'root' })
export class ContextoVenta {
  private readonly actual = signal<SucursalRef | null>(null)

  readonly sucursal = this.actual.asReadonly()
  readonly sucursalId = computed(() => this.actual()?.id ?? '')
  readonly perfil = computed(() => this.actual()?.perfil ?? null)

  fijar(sucursal: SucursalRef | null): void {
    this.actual.set(sucursal)
  }
}
