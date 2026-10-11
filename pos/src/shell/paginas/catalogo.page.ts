import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { ProductoRef } from '@pos-core/index'
import { facetasDelCatalogo } from '@pos-adaptadores/simulado/index'
import { IconoProductoComponent, MonedaPipe, PUERTO_CATALOGO } from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'
import { FichaProductoComponent } from './ficha-producto.component'

/**
 * Catálogo.
 *
 * No es el mostrador con otro nombre. En venta se busca UN producto para
 * cobrarlo, aquí se mira el catálogo ENTERO para gestionarlo: qué está
 * agotado, qué hay por reponer, qué precios tiene cada presentación.
 *
 * Por eso es una tabla y no una rejilla de tarjetas: aquí se comparan
 * columnas —stock, precios, laboratorio— y para comparar hace falta que
 * estén alineadas. Las tarjetas sirven para reconocer, las tablas para
 * revisar.
 *
 * Y por eso tampoco lleva la columna del ticket: desde el catálogo no se
 * vende.
 */
@Component({
  selector: 'km-catalogo-page',
  imports: [FormsModule, MonedaPipe, IconoProductoComponent, FichaProductoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-fade-in flex h-full flex-col gap-3">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="pv-titulo-seccion">Catálogo</h2>
          <p class="text-tenue text-sm">
            {{ productos().length }} productos · {{ agotados() }} agotados · {{ porReponer() }} por
            reponer
          </p>
        </div>
        <input
          class="pv-campo w-full max-w-xs text-sm"
          type="search"
          placeholder="Buscar en el catálogo…"
          aria-label="Buscar en el catálogo"
          [ngModel]="texto()"
          (ngModelChange)="buscar($event)"
        />
      </header>

      <div class="flex shrink-0 flex-wrap gap-1.5">
        @for (opcion of estados; track opcion.valor) {
          <button
            class="pv-chip"
            type="button"
            [class.pv-chip-activo]="estado() === opcion.valor"
            (click)="filtrarEstado(opcion.valor)"
          >
            {{ opcion.etiqueta }}
          </button>
        }
      </div>

      <div class="pv-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="pv-tabla">
            <thead>
              <tr>
                <th class="w-10"></th>
                <th>Producto</th>
                <th class="hidden md:table-cell">Laboratorio</th>
                <th class="hidden lg:table-cell">Categoría</th>
                <th class="text-right">Stock</th>
                <th class="text-right">Presentaciones</th>
                <th class="w-20"></th>
              </tr>
            </thead>
            <tbody>
              @for (producto of productos(); track producto.id) {
                <tr [class.pv-fila-agotada]="producto.stock === 0">
                  <td><km-icono-producto [clave]="producto.icono" [tamano]="30" /></td>
                  <td>
                    <p class="truncate text-sm font-semibold">{{ producto.descripcion }}</p>
                    <p class="pv-cifra text-tenue text-[11px]">{{ producto.codigoBarras }}</p>
                  </td>
                  <td class="text-tenue hidden text-xs md:table-cell">
                    {{ campo(producto, 'Laboratorio') }}
                  </td>
                  <td class="text-tenue hidden text-xs lg:table-cell">
                    {{ producto.categoria?.nombre }}
                  </td>
                  <td class="text-right">
                    @if (producto.stock === undefined) {
                      <span class="text-tenue text-xs">—</span>
                    } @else {
                      <span
                        class="pv-cifra text-sm font-semibold"
                        [class.text-error]="producto.stock === 0"
                        [class.text-aviso]="producto.stock > 0 && producto.stock <= 20"
                      >
                        {{ producto.stock }}
                      </span>
                      <span class="text-tenue text-[11px]">
                        {{ producto.unidadAlmacen.abreviatura }}
                      </span>
                    }
                  </td>
                  <td>
                    <div class="flex flex-wrap justify-end gap-1">
                      @for (pres of producto.presentaciones; track pres.id) {
                        <span class="pv-pres pv-pres-estatica">
                          {{ pres.unidad.abreviatura }}
                          <span class="pv-cifra font-semibold">
                            {{ pres.precio | moneda: false }}
                          </span>
                        </span>
                      }
                    </div>
                  </td>
                  <td class="text-right">
                    <button class="pv-tabla-accion" type="button" (click)="ficha.set(producto)">
                      Ficha
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="text-tenue py-10 text-center text-sm">
                    Nada que coincida con la búsqueda.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    @if (ficha(); as abierto) {
      <km-ficha-producto [producto]="abierto" (cerrar)="ficha.set(null)" />
    }
  `,
})
export class CatalogoPage {
  private readonly catalogo = inject(PUERTO_CATALOGO)
  private readonly sesion = inject(SesionStore)

  protected readonly estados = [
    { valor: '', etiqueta: 'Todo' },
    { valor: 'ok', etiqueta: 'Disponible' },
    { valor: 'bajo', etiqueta: 'Por reponer' },
    { valor: 'agotado', etiqueta: 'Agotado' },
  ]

  protected readonly texto = signal('')
  protected readonly estado = signal('')
  protected readonly productos = signal<ProductoRef[]>([])
  protected readonly ficha = signal<ProductoRef | null>(null)

  protected readonly agotados = computed(() => this.productos().filter((p) => p.stock === 0).length)
  protected readonly porReponer = computed(
    () =>
      this.productos().filter((p) => p.stock !== undefined && p.stock > 0 && p.stock <= 20).length,
  )

  /** Las facetas existen; aquí solo se usa la de disponibilidad. */
  protected readonly hayFacetas = facetasDelCatalogo().length > 0

  constructor() {
    void this.cargar()
  }

  private async cargar(): Promise<void> {
    const filtros: Record<string, string> = {}
    if (this.estado()) filtros['disponibilidad'] = this.estado()
    this.productos.set(
      await this.catalogo.buscar({
        texto: this.texto(),
        sucursalId: this.sesion.sucursal()?.id ?? '',
        filtros,
        orden: 'nombre',
        limite: 200,
      }),
    )
  }

  protected buscar(texto: string): void {
    this.texto.set(texto)
    void this.cargar()
  }

  protected filtrarEstado(valor: string): void {
    this.estado.set(valor)
    void this.cargar()
  }

  /** Lee un dato de la ficha sin que la tabla sepa de farmacia. */
  protected campo(producto: ProductoRef, etiqueta: string): string {
    return producto.ficha?.find((campo) => campo.etiqueta === etiqueta)?.valor ?? '—'
  }
}
