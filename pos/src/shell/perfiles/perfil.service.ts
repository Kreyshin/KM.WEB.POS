import { computed, inject, Injectable, signal } from '@angular/core'
import type { MarcaProducto, ProductoRef, Ticket, Validacion } from '@pos-core/index'
import { validacionOk } from '@pos-core/index'
import type { PerfilRubroAngular } from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'
import { cargarPerfil } from './registro'

/**
 * El perfil del rubro de la sucursal activa, cargado y a mano.
 *
 * Vive en el shell y no en `pos-core-ui` porque el registro nombra los
 * perfiles y eso es decisión de la aplicación, no de la librería.
 *
 * Todo lo que expone tiene respaldo: sin perfil registrado, no hay marcas
 * y toda validación pasa. Una sucursal sin rubro configurado tiene que
 * poder vender igual; perder las reglas del rubro no puede ser perder la
 * caja.
 */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly sesion = inject(SesionStore)

  private readonly cargado = signal<PerfilRubroAngular | null>(null)

  readonly perfil = this.cargado.asReadonly()
  readonly nombre = computed(() => this.cargado()?.nombre ?? null)

  async cargar(): Promise<void> {
    const codigo = this.sesion.sucursal()?.perfil ?? null
    this.cargado.set((await cargarPerfil(codigo)) as PerfilRubroAngular | null)
  }

  /** Marcas del producto, o ninguna si no hay perfil. */
  marcas(producto: ProductoRef): readonly MarcaProducto[] {
    return this.cargado()?.marcasDeProducto?.(producto) ?? []
  }

  /** La nota sin lo que ya se enseña como marca. */
  nota(producto: ProductoRef): string {
    const cruda = producto.nota ?? ''
    return this.cargado()?.limpiarNota?.(cruda) ?? cruda
  }

  async validarAntesDeCobrar(ticket: Ticket): Promise<Validacion> {
    return (await this.cargado()?.validarAntesDeCobrar?.(ticket)) ?? validacionOk
  }

  limpiar(): void {
    this.cargado.set(null)
  }
}
