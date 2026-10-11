import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
  IGV_GENERAL,
  type CampoFicha,
  type PresentacionVenta,
  type ProductoRef,
} from '@pos-core/index'
import { IconoProductoComponent } from '@pos-core-ui/index'

/** Unidades frecuentes. El negocio puede escribir otras. */
const UNIDADES = [
  { codigo: 'UND', nombre: 'Unidad', abreviatura: 'und' },
  { codigo: 'TAB', nombre: 'Tableta', abreviatura: 'tab' },
  { codigo: 'BLI', nombre: 'Blíster', abreviatura: 'bli' },
  { codigo: 'CAJ', nombre: 'Caja', abreviatura: 'caj' },
  { codigo: 'FCO', nombre: 'Frasco', abreviatura: 'fco' },
  { codigo: 'KGR', nombre: 'Kilogramo', abreviatura: 'kg' },
  { codigo: 'LTR', nombre: 'Litro', abreviatura: 'L' },
]

const ICONOS = ['tableta', 'capsula', 'frasco', 'inyectable', 'caja', 'prenda', 'generico']

/**
 * Alta y edición de un producto.
 *
 * El formulario está ordenado como se da de alta un producto de verdad, no
 * como está el modelo: primero qué es, luego en qué se guarda, luego cómo
 * se vende. La unidad de almacén va ANTES que las presentaciones porque
 * cada presentación se define contra ella, y al revés no se entiende qué
 * significa el factor.
 *
 * Las presentaciones son filas que se añaden y se quitan. Un producto sin
 * ninguna no se puede vender, así que siempre hay al menos una y la
 * primera no se puede borrar.
 *
 * La ficha son pares etiqueta/valor libres. Es lo que permite que la misma
 * pantalla sirva en una botica —principio activo, laboratorio— y en una
 * tienda de ropa —composición, tejido—, sin saber de ninguna de las dos.
 */
@Component({
  selector: 'km-editor-producto',
  imports: [FormsModule, IconoProductoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div class="pv-velo" role="dialog" aria-modal="true" aria-label="Datos del producto">
      <button
        class="pv-velo-cierre"
        type="button"
        aria-label="Cerrar"
        (click)="cerrar.emit()"
      ></button>

      <div class="pv-panel pv-entra pv-editor relative">
        <header class="flex items-center justify-between gap-3 border-b border-linea p-5">
          <h2 class="text-base font-semibold">
            {{ producto() ? 'Editar producto' : 'Nuevo producto' }}
          </h2>
          <button class="text-tenue text-sm" type="button" (click)="cerrar.emit()">Cerrar</button>
        </header>

        <div class="pv-editor-cuerpo">
          <!-- 1. Qué es -->
          <section>
            <p class="pv-etiqueta text-tenue mb-2">Qué es</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="sm:col-span-2 block">
                <span class="pv-etiqueta text-tenue">Descripción</span>
                <input
                  class="pv-campo mt-1 text-sm"
                  type="text"
                  placeholder="Paracetamol 500 mg"
                  [(ngModel)]="descripcion"
                  (ngModelChange)="tocar()"
                />
              </label>

              <label class="block">
                <span class="pv-etiqueta text-tenue">Código de barras</span>
                <input
                  class="pv-campo pv-cifra mt-1 text-sm"
                  type="text"
                  inputmode="numeric"
                  placeholder="7750001000017"
                  [(ngModel)]="codigoBarras"
                  (ngModelChange)="tocar()"
                />
              </label>

              <label class="block">
                <span class="pv-etiqueta text-tenue">Categoría</span>
                <input
                  class="pv-campo mt-1 text-sm"
                  type="text"
                  placeholder="Analgésicos"
                  [(ngModel)]="categoria"
                  (ngModelChange)="tocar()"
                />
              </label>
            </div>

            <p class="pv-etiqueta text-tenue mt-3 mb-1.5">Icono</p>
            <div class="flex flex-wrap gap-1.5">
              @for (clave of iconos; track clave) {
                <button
                  class="pv-icono-opcion"
                  type="button"
                  [class.pv-icono-elegido]="icono === clave"
                  [attr.aria-label]="clave"
                  (click)="icono = clave; tocar()"
                >
                  <km-icono-producto [clave]="clave" [tamano]="30" />
                </button>
              }
            </div>
          </section>

          <!-- 2. Cómo se guarda -->
          <section>
            <p class="pv-etiqueta text-tenue mb-2">Cómo se guarda</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="pv-etiqueta text-tenue">Unidad de almacén</span>
                <select
                  class="pv-campo mt-1 text-sm"
                  [(ngModel)]="unidadAlmacen"
                  (ngModelChange)="tocar()"
                >
                  @for (unidad of unidades; track unidad.codigo) {
                    <option [value]="unidad.codigo">{{ unidad.nombre }}</option>
                  }
                </select>
              </label>

              <label class="block">
                <span class="pv-etiqueta text-tenue">Existencias</span>
                <input
                  class="pv-campo pv-cifra mt-1 text-right text-sm"
                  type="number"
                  min="0"
                  step="1"
                  [(ngModel)]="stock"
                  (ngModelChange)="tocar()"
                />
              </label>
            </div>
            <p class="text-tenue mt-1.5 text-xs">
              Es la unidad en la que cuenta el inventario. Cada forma de vender se define contra
              ella.
            </p>
          </section>

          <!-- 3. Cómo se vende -->
          <section>
            <div class="mb-2 flex items-baseline justify-between">
              <p class="pv-etiqueta text-tenue">Cómo se vende</p>
              <button class="pv-tabla-accion" type="button" (click)="anadirPresentacion()">
                + Añadir forma
              </button>
            </div>

            <div class="flex flex-col gap-2">
              @for (pres of presentaciones(); track pres.id; let i = $index) {
                <div class="pv-presentacion-fila">
                  <label class="pv-pres-unidad">
                    <span class="pv-etiqueta text-tenue">Unidad</span>
                    <select
                      class="pv-campo mt-1 text-sm"
                      [ngModel]="pres.unidad.codigo"
                      (ngModelChange)="cambiarUnidad(i, $event)"
                    >
                      @for (unidad of unidades; track unidad.codigo) {
                        <option [value]="unidad.codigo">{{ unidad.nombre }}</option>
                      }
                    </select>
                  </label>

                  <label class="pv-pres-numero">
                    <span class="pv-etiqueta text-tenue">Equivale a</span>
                    <input
                      class="pv-campo pv-cifra mt-1 text-right text-sm"
                      type="number"
                      min="0.001"
                      step="1"
                      [ngModel]="pres.factorAlmacen"
                      (ngModelChange)="cambiarCampo(i, 'factorAlmacen', $event)"
                    />
                  </label>

                  <label class="pv-pres-numero">
                    <span class="pv-etiqueta text-tenue">Precio</span>
                    <input
                      class="pv-campo pv-cifra mt-1 text-right text-sm"
                      type="number"
                      min="0"
                      step="0.10"
                      [ngModel]="pres.precio"
                      (ngModelChange)="cambiarCampo(i, 'precio', $event)"
                    />
                  </label>

                  <div class="flex shrink-0 flex-col gap-1 pt-4">
                    <label class="pv-casilla">
                      <input
                        type="checkbox"
                        [ngModel]="pres.igvTasa === 0"
                        (ngModelChange)="cambiarExoneracion(i, $event)"
                      />
                      <span>Exonerado</span>
                    </label>
                    <label class="pv-casilla">
                      <input
                        type="checkbox"
                        [ngModel]="pres.fraccionada === true"
                        (ngModelChange)="cambiarCampo(i, 'fraccionada', $event)"
                      />
                      <span>Suelta</span>
                    </label>
                  </div>

                  <button
                    class="pv-paso mt-4 shrink-0"
                    type="button"
                    [disabled]="presentaciones().length === 1"
                    aria-label="Quitar esta forma de venta"
                    (click)="quitarPresentacion(i)"
                  >
                    ×
                  </button>
                </div>

                <p class="text-tenue -mt-1 pl-1 text-xs">{{ equivalencia(pres) }}</p>
              }
            </div>
          </section>

          <!-- 4. Ficha -->
          <section>
            <div class="mb-2 flex items-baseline justify-between">
              <p class="pv-etiqueta text-tenue">Ficha</p>
              <button class="pv-tabla-accion" type="button" (click)="anadirCampo()">
                + Añadir dato
              </button>
            </div>
            <p class="text-tenue mb-2 text-xs">
              Lo que se contesta cuando el cliente pregunta. En una botica: principio activo,
              laboratorio, registro sanitario.
            </p>

            <div class="flex flex-col gap-1.5">
              @for (campo of ficha(); track $index; let i = $index) {
                <div class="pv-ficha-fila">
                  <input
                    class="pv-campo text-sm"
                    type="text"
                    placeholder="Etiqueta"
                    [ngModel]="campo.etiqueta"
                    (ngModelChange)="cambiarFicha(i, 'etiqueta', $event)"
                  />
                  <input
                    class="pv-campo text-sm"
                    type="text"
                    placeholder="Valor"
                    [ngModel]="campo.valor"
                    (ngModelChange)="cambiarFicha(i, 'valor', $event)"
                  />
                  <button
                    class="pv-paso shrink-0"
                    type="button"
                    aria-label="Quitar este dato"
                    (click)="quitarCampo(i)"
                  >
                    ×
                  </button>
                </div>
              } @empty {
                <p class="text-tenue text-xs">Sin datos todavía.</p>
              }
            </div>
          </section>
        </div>

        <footer class="flex items-center gap-3 border-t border-linea p-4">
          @if (producto(); as existente) {
            <button
              class="pv-boton pv-boton-tenue"
              type="button"
              (click)="eliminar.emit(existente.id)"
            >
              Eliminar
            </button>
          }
          @if (problema(); as mensaje) {
            <p class="pv-error-campo flex-1">{{ mensaje }}</p>
          }
          <button
            class="pv-boton pv-boton-accion ml-auto justify-center"
            type="button"
            [disabled]="!!problema()"
            (click)="confirmar()"
          >
            Guardar producto
          </button>
        </footer>
      </div>
    </div>
  `,
})
export class EditorProductoComponent {
  /** Nulo para un alta. */
  readonly producto = input<ProductoRef | null>(null)

  readonly cerrar = output<void>()
  readonly guardar = output<ProductoRef>()
  readonly eliminar = output<string>()

  protected readonly unidades = UNIDADES
  protected readonly iconos = ICONOS

  protected descripcion = ''
  protected codigoBarras = ''
  protected categoria = ''
  protected icono = 'generico'
  protected unidadAlmacen = 'UND'
  protected stock: number | null = 0

  protected readonly presentaciones = signal<PresentacionVenta[]>([])
  protected readonly ficha = signal<CampoFicha[]>([])

  /** Fuerza el recálculo de la validación con `ngModel` sobre campos llanos. */
  protected readonly cambios = signal(0)

  constructor() {
    queueMicrotask(() => this.cargar())
  }

  private cargar(): void {
    const actual = this.producto()
    if (!actual) {
      this.presentaciones.set([this.presentacionEnBlanco()])
      return
    }
    this.descripcion = actual.descripcion
    this.codigoBarras = actual.codigoBarras ?? ''
    this.categoria = actual.categoria?.nombre ?? ''
    this.icono = actual.icono ?? 'generico'
    this.unidadAlmacen = actual.unidadAlmacen.codigo
    this.stock = actual.stock ?? 0
    this.presentaciones.set(actual.presentaciones.map((pres) => ({ ...pres })))
    this.ficha.set((actual.ficha ?? []).map((campo) => ({ ...campo })))

    // Los campos llanos no son señales, así que `problema()` quedó
    // calculado con el formulario vacío y decía «falta la descripción»
    // sobre un producto que la tiene. Se invalida tras cargar.
    this.tocar()
  }

  protected tocar(): void {
    this.cambios.update((n) => n + 1)
  }

  /**
   * Lo que impide guardar, en una frase.
   *
   * Un solo mensaje y no una lista: en un formulario corto, enseñar cinco
   * errores a la vez hace que no se lea ninguno. Se corrige el primero y
   * aparece el siguiente.
   */
  protected readonly problema = computed<string | null>(() => {
    this.cambios()
    if (this.descripcion.trim().length < 3) return 'Falta la descripción.'
    const presentaciones = this.presentaciones()
    if (presentaciones.length === 0) return 'Añade al menos una forma de venta.'
    if (presentaciones.some((pres) => pres.precio <= 0)) {
      return 'Toda forma de venta necesita un precio mayor que cero.'
    }
    if (presentaciones.some((pres) => pres.factorAlmacen <= 0)) {
      return 'La equivalencia con el almacén tiene que ser mayor que cero.'
    }
    if (this.ficha().some((campo) => campo.etiqueta.trim() && !campo.valor.trim())) {
      return 'Hay un dato de la ficha con etiqueta y sin valor.'
    }
    return null
  })

  protected anadirPresentacion(): void {
    this.presentaciones.update((lista) => [...lista, this.presentacionEnBlanco()])
    this.tocar()
  }

  protected quitarPresentacion(indice: number): void {
    // La primera no se quita: un producto sin forma de venta no se puede
    // vender, y guardarlo así solo rompe la pantalla de venta más tarde.
    if (this.presentaciones().length === 1) return
    this.presentaciones.update((lista) => lista.filter((_, i) => i !== indice))
    this.tocar()
  }

  protected cambiarUnidad(indice: number, codigo: string): void {
    const unidad = UNIDADES.find((u) => u.codigo === codigo) ?? UNIDADES[0]
    this.actualizar(indice, { unidad })
  }

  protected cambiarCampo(
    indice: number,
    campo: 'factorAlmacen' | 'precio' | 'fraccionada',
    valor: unknown,
  ): void {
    if (campo === 'fraccionada') this.actualizar(indice, { fraccionada: Boolean(valor) })
    else this.actualizar(indice, { [campo]: Number(valor) || 0 })
  }

  protected cambiarExoneracion(indice: number, exonerado: boolean): void {
    this.actualizar(indice, { igvTasa: exonerado ? 0 : IGV_GENERAL })
  }

  private actualizar(indice: number, parche: Partial<PresentacionVenta>): void {
    this.presentaciones.update((lista) =>
      lista.map((pres, i) => (i === indice ? { ...pres, ...parche } : pres)),
    )
    this.tocar()
  }

  protected anadirCampo(): void {
    this.ficha.update((lista) => [...lista, { etiqueta: '', valor: '' }])
  }

  protected quitarCampo(indice: number): void {
    this.ficha.update((lista) => lista.filter((_, i) => i !== indice))
    this.tocar()
  }

  protected cambiarFicha(indice: number, campo: 'etiqueta' | 'valor', valor: string): void {
    this.ficha.update((lista) =>
      lista.map((dato, i) => (i === indice ? { ...dato, [campo]: valor } : dato)),
    )
    this.tocar()
  }

  /** «1 bli = 10 tab». Se enseña al teclear, que es cuando se entiende. */
  protected equivalencia(pres: PresentacionVenta): string {
    const almacen = UNIDADES.find((u) => u.codigo === this.unidadAlmacen) ?? UNIDADES[0]
    if (pres.unidad.codigo === almacen.codigo && pres.factorAlmacen === 1) {
      return `Vender 1 ${pres.unidad.abreviatura} descuenta 1 del stock.`
    }
    return `Vender 1 ${pres.unidad.abreviatura} descuenta ${pres.factorAlmacen} ${almacen.abreviatura} del stock.`
  }

  protected confirmar(): void {
    if (this.problema()) return
    const almacen = UNIDADES.find((u) => u.codigo === this.unidadAlmacen) ?? UNIDADES[0]
    const categoria = this.categoria.trim()

    this.guardar.emit({
      id: this.producto()?.id ?? '',
      descripcion: this.descripcion.trim(),
      codigoBarras: this.codigoBarras.trim() || undefined,
      categoria: categoria
        ? { codigo: categoria.slice(0, 5).toUpperCase(), nombre: categoria }
        : undefined,
      icono: this.icono,
      unidadAlmacen: almacen,
      presentaciones: this.presentaciones(),
      stock: this.stock ?? 0,
      // Los campos a medio escribir no se guardan: una ficha con etiquetas
      // vacías se ve peor que una ficha corta.
      ficha: this.ficha().filter((campo) => campo.etiqueta.trim() && campo.valor.trim()),
    })
  }

  private presentacionEnBlanco(): PresentacionVenta {
    const almacen = UNIDADES.find((u) => u.codigo === this.unidadAlmacen) ?? UNIDADES[0]
    return {
      id: `pres-${Math.random().toString(36).slice(2, 8)}`,
      unidad: almacen,
      factorAlmacen: 1,
      precio: 0,
      igvTasa: IGV_GENERAL,
    }
  }
}
