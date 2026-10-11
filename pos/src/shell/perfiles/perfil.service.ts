import { computed, inject, Injectable, signal } from '@angular/core'
import type {
  CampoLinea,
  DatoLinea,
  LineaTicket,
  MarcaProducto,
  ProductoRef,
  Ticket,
  Validacion,
} from '@pos-core/index'
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

  /** Cómo se nombra la línea. Sin perfil, la descripción pelada. */
  describirLinea(linea: LineaTicket): string {
    return this.cargado()?.describirLinea?.(linea) ?? linea.descripcion
  }

  /**
   * Los datos del rubro de una línea, sueltos y con su nombre.
   *
   * Para el carrito. `describirLinea` compone una frase que en el recibo
   * está bien y en una columna de 22rem se recorta justo por el lote.
   */
  detalleDeLinea(linea: LineaTicket): readonly DatoLinea[] {
    return this.cargado()?.detalleDeLinea?.(linea) ?? []
  }

  /** Qué pedir antes de agregar. Vacío es el caso normal. */
  camposDeLinea(producto: ProductoRef, presentacionId: string): readonly CampoLinea[] {
    return this.cargado()?.camposDeLinea?.(producto, presentacionId) ?? []
  }

  /** Lo que el perfil estampa sin preguntar. */
  atributosIniciales(producto: ProductoRef, presentacionId: string): Record<string, unknown> {
    return this.cargado()?.atributosIniciales?.(producto, presentacionId) ?? {}
  }

  async validarAntesDeCobrar(ticket: Ticket): Promise<Validacion> {
    return (await this.cargado()?.validarAntesDeCobrar?.(ticket)) ?? validacionOk
  }

  limpiar(): void {
    this.cargado.set(null)
  }
}
