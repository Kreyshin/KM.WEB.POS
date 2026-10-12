import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { ProductoRef } from '@pos-core/index'

import {
  IconoProductoComponent,
  MonedaPipe,
  PUERTO_CATALOGO,
  PUERTO_MANTENIMIENTO_CATALOGO,
  IconoComponent,
} from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'
import { FichaProductoComponent } from './ficha-producto.component'
import { EditorProductoComponent } from './editor-producto.component'
import { CargaMasivaComponent } from './carga-masiva.component'

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
  imports: [
    FormsModule,
    MonedaPipe,
    IconoProductoComponent,
    FichaProductoComponent,
    IconoComponent,
    EditorProductoComponent,
    CargaMasivaComponent,
  ],
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
        <div class="flex gap-2">
          <input
            class="pv-campo w-56 text-sm"
            type="search"
            placeholder="Buscar en el catálogo…"
            aria-label="Buscar en el catálogo"
            [ngModel]="texto()"
            (ngModelChange)="buscar($event)"
          />
          <button class="pv-boton pv-boton-tenue" type="button" (click)="cargando.set(true)">
            Carga masiva
          </button>
          <button class="pv-boton pv-boton-accion" type="button" (click)="nuevo()">
            Nuevo producto
          </button>
        </div>
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
                  <!-- Iconos, no dos palabras repetidas en cada fila: el
                       texto compite con los datos, que es lo que hay que
                       leer. Es la forma de las tablas de las hermanas. -->
                  <td>
                    <div class="flex justify-end gap-1.5">
                      <button
                        class="pv-boton-icono"
                        type="button"
                        [attr.aria-label]="'Ver la ficha de ' + producto.descripcion"
                        title="Ver ficha"
                        (click)="ficha.set(producto)"
                      >
                        <km-icono nombre="ver" />
                      </button>
                      <button
                        class="pv-boton-icono"
                        type="button"
                        [attr.aria-label]="'Editar ' + producto.descripcion"
                        title="Editar"
                        (click)="editar(producto)"
                      >
                        <km-icono nombre="editar" />
                      </button>
                    </div>
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

    @if (cargando()) {
      <km-carga-masiva #carga (cerrar)="cargando.set(false)" (importar)="importarLote($event)" />
    }

    @if (editando()) {
      <km-editor-producto
        [producto]="enEdicion()"
        (cerrar)="editando.set(false)"
        (guardar)="guardarProducto($event)"
        (eliminar)="eliminarProducto($event)"
      />
    }
  `,
})
export class CatalogoPage {
  private readonly catalogo = inject(PUERTO_CATALOGO)
  private readonly mantenimiento = inject(PUERTO_MANTENIMIENTO_CATALOGO)
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
  protected readonly editando = signal(false)
  protected readonly enEdicion = signal<ProductoRef | null>(null)
  protected readonly cargando = signal(false)

  private readonly carga = viewChild<CargaMasivaComponent>('carga')

  protected readonly agotados = computed(() => this.productos().filter((p) => p.stock === 0).length)
  protected readonly porReponer = computed(
    () =>
      this.productos().filter((p) => p.stock !== undefined && p.stock > 0 && p.stock <= 20).length,
  )

  constructor() {
    void this.cargar()
  }

  private async cargar(): Promise<void> {
    const filtros: Record<string, readonly string[]> = {}
    if (this.estado()) filtros['disponibilidad'] = [this.estado()]
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

  protected nuevo(): void {
    this.enEdicion.set(null)
    this.editando.set(true)
  }

  protected editar(producto: ProductoRef): void {
    this.enEdicion.set(producto)
    this.editando.set(true)
  }

  protected async guardarProducto(producto: ProductoRef): Promise<void> {
    // Sin id: lo pone el adaptador al guardar, que es quien conoce su
    // formato. La pantalla no tiene por qué saberlo.
    await this.mantenimiento.guardar(producto)
    this.editando.set(false)
    await this.cargar()
  }

  /**
   * Guarda el lote completo.
   *
   * De uno en uno y no en paralelo: el adaptador escribe sobre la misma
   * llave de almacenamiento, y en paralelo la última escritura pisaría a
   * las demás. Con 500 productos sigue siendo instantáneo.
   */
  protected async importarLote(productos: ProductoRef[]): Promise<void> {
    try {
      for (const producto of productos) {
        await this.mantenimiento.guardar(producto)
      }
      this.cargando.set(false)
      await this.cargar()
    } catch (error) {
      this.carga()?.fallar(
        error instanceof Error ? error.message : 'No se pudieron guardar los productos.',
      )
    }
  }

  protected async eliminarProducto(productoId: string): Promise<void> {
    await this.mantenimiento.eliminar(productoId)
    this.editando.set(false)
    await this.cargar()
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
