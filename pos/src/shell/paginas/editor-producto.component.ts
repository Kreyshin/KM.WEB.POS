import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
  IGV_GENERAL,
  type CampoFicha,
  type EjemplarProducto,
  type PresentacionVenta,
  type VarianteProducto,
  type ProductoRef,
} from '@pos-core/index'
import { IconoComponent, IconoProductoComponent } from '@pos-core-ui/index'
import { PerfilService } from '../perfiles/perfil.service'

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
  imports: [FormsModule, IconoComponent, IconoProductoComponent],
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
          <button
            class="pv-boton-icono"
            type="button"
            aria-label="Cerrar"
            title="Cerrar"
            (click)="cerrar.emit()"
          >
            <km-icono nombre="cerrar" />
          </button>
        </header>

        <div class="pv-editor-cuerpo">
          <!-- 1. Qué es -->
          <section>
            <p class="pv-etiqueta text-tenue mb-2">Qué es</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="sm:col-span-2 block">
                <span class="pv-etiqueta-campo">Descripción</span>
                <input
                  class="pv-campo mt-1 text-sm"
                  type="text"
                  [placeholder]="ejemplo()?.descripcion ?? 'Nombre del producto'"
                  [(ngModel)]="descripcion"
                  (ngModelChange)="tocar()"
                />
              </label>

              <label class="block">
                <span class="pv-etiqueta-campo">Código de barras</span>
                <input
                  class="pv-campo pv-cifra mt-1 text-sm"
                  type="text"
                  inputmode="numeric"
                  [placeholder]="ejemplo()?.codigoBarras ?? 'Código de barras'"
                  [(ngModel)]="codigoBarras"
                  (ngModelChange)="tocar()"
                />
              </label>

              <label class="block">
                <span class="pv-etiqueta-campo">Categoría</span>
                <input
                  class="pv-campo mt-1 text-sm"
                  type="text"
                  [placeholder]="ejemplo()?.categoria ?? 'Categoría'"
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
                <span class="pv-etiqueta-campo">Unidad de almacén</span>
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
                <span class="pv-etiqueta-campo">Existencias</span>
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
            <div class="mb-2 flex items-center justify-between gap-3">
              <p class="pv-etiqueta text-tenue">Cómo se vende</p>
              <button class="pv-boton-menudo" type="button" (click)="anadirPresentacion()">
                <km-icono nombre="mas" tamano="xs" />
                Forma de venta
              </button>
            </div>

            <!--
              Tabla, no fichas apiladas.

              Antes cada forma de venta era una tira con el precio encogido
              entre dos casillas de verificación y una equis suelta: lo que
              se mira al dar de alta un producto —cuánto cuesta cada
              presentación— era lo más pequeño de la pantalla. Ahora el
              precio manda por tamaño y las marcas son pastillas que se ven
              encendidas o apagadas de un vistazo, no casillas que hay que
              leer.
            -->
            <div class="pv-tabla-pres">
              <div class="pv-tabla-pres-cab" aria-hidden="true">
                <span>Unidad</span>
                <span class="text-right">Equivale a</span>
                <span class="text-right">Precio</span>
                <span>Marcas</span>
                <span></span>
              </div>

              @for (pres of presentaciones(); track pres.id; let i = $index) {
                <div class="pv-tabla-pres-fila">
                  <select
                    class="pv-campo text-sm"
                    [attr.aria-label]="'Unidad de la forma de venta ' + (i + 1)"
                    [ngModel]="pres.unidad.codigo"
                    (ngModelChange)="cambiarUnidad(i, $event)"
                  >
                    @for (unidad of unidades; track unidad.codigo) {
                      <option [value]="unidad.codigo">{{ unidad.nombre }}</option>
                    }
                  </select>

                  <input
                    class="pv-campo pv-cifra text-right text-sm"
                    type="number"
                    min="0.001"
                    step="1"
                    [attr.aria-label]="'Equivalencia con el almacén de la forma ' + (i + 1)"
                    [ngModel]="pres.factorAlmacen"
                    (ngModelChange)="cambiarCampo(i, 'factorAlmacen', $event)"
                  />

                  <!-- El precio lleva su moneda dentro: un número sin unidad
                       en una rejilla de números se confunde con el factor. -->
                  <div class="pv-campo-moneda">
                    <span aria-hidden="true">S/</span>
                    <input
                      class="pv-cifra"
                      type="number"
                      min="0"
                      step="0.10"
                      [attr.aria-label]="'Precio de la forma de venta ' + (i + 1)"
                      [ngModel]="pres.precio"
                      (ngModelChange)="cambiarCampo(i, 'precio', $event)"
                    />
                  </div>

                  <div class="flex flex-wrap gap-1">
                    <button
                      class="pv-marca-conmuta"
                      type="button"
                      [class.pv-marca-puesta]="pres.igvTasa === 0"
                      [attr.aria-pressed]="pres.igvTasa === 0"
                      title="Exonerado de IGV"
                      (click)="cambiarExoneracion(i, pres.igvTasa !== 0)"
                    >
                      Exonerado
                    </button>
                    <button
                      class="pv-marca-conmuta"
                      type="button"
                      [class.pv-marca-puesta]="pres.fraccionada === true"
                      [attr.aria-pressed]="pres.fraccionada === true"
                      title="Se puede vender suelta"
                      (click)="cambiarCampo(i, 'fraccionada', pres.fraccionada !== true)"
                    >
                      Suelta
                    </button>
                  </div>

                  <button
                    class="pv-boton-icono pv-boton-icono-peligro"
                    type="button"
                    [disabled]="presentaciones().length === 1"
                    [attr.aria-label]="'Quitar la forma de venta ' + (i + 1)"
                    [title]="
                      presentaciones().length === 1
                        ? 'Un producto necesita al menos una forma de venta'
                        : 'Quitar'
                    "
                    (click)="quitarPresentacion(i)"
                  >
                    <km-icono nombre="eliminar" />
                  </button>

                  <p class="pv-tabla-pres-nota">{{ equivalencia(pres) }}</p>
                </div>
              }
            </div>
          </section>

          <!-- 4. Variantes: solo donde el rubro abre el producto en ejes -->
          @if (ejes().length > 0) {
            <section>
              <p class="pv-etiqueta text-tenue mb-2">Tallas y colores</p>
              <p class="text-tenue mb-2 text-xs">
                Marca lo que existe de esta prenda. Cada combinación lleva su propio stock.
              </p>

              @for (eje of ejes(); track eje.clave) {
                <div class="mb-3">
                  <div class="mb-1.5 flex items-center gap-2">
                    <span class="pv-etiqueta-campo">{{ eje.etiqueta }}</span>
                    <div class="pv-campo-icono h-7 w-40">
                      <km-icono nombre="mas" tamano="xs" />
                      <input
                        type="text"
                        placeholder="Otro valor…"
                        [attr.aria-label]="'Añadir un valor de ' + eje.etiqueta"
                        [ngModel]="nuevoValor()[eje.clave] ?? ''"
                        (ngModelChange)="escribirNuevoValor(eje.clave, $event)"
                        (keydown.enter)="anadirValor(eje.clave)"
                      />
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-1">
                    @for (valor of valoresDe(eje); track valor) {
                      <button
                        class="pv-marca-conmuta"
                        type="button"
                        [class.pv-marca-puesta]="tiene(eje.clave, valor)"
                        [attr.aria-pressed]="tiene(eje.clave, valor)"
                        (click)="alternarValor(eje.clave, valor)"
                      >
                        {{ valor }}
                      </button>
                    }
                  </div>
                </div>
              }

              <!--
                La matriz sale de lo marcado, y solo cuando hay algo en los
                dos ejes: una tabla de tallas sin colores es una columna
                vacía que no dice nada.

                Una celda en blanco NO es cero: es «no se trabaja». La
                diferencia importa en el mostrador —«no queda» y «no lo
                tenemos» son dos respuestas distintas— y es la que ya
                distingue la matriz de la pantalla de venta.
              -->
              @if (combinaciones().length > 0) {
                <div class="pv-matriz-alta">
                  <div class="pv-matriz-alta-cab" aria-hidden="true">
                    <span>Combinación</span>
                    <span class="text-right">Stock</span>
                    <span class="text-right">Precio propio</span>
                  </div>
                  @for (combo of combinaciones(); track combo.id) {
                    <div class="pv-matriz-alta-fila">
                      <span class="flex flex-wrap items-center gap-1">
                        @for (eje of ejes(); track eje.clave) {
                          @if (combo.atributos[eje.clave]; as valor) {
                            <span class="pv-dato-linea">
                              <span class="pv-dato-clave">{{ eje.etiqueta }}</span>
                              {{ valor }}
                            </span>
                          }
                        }
                      </span>
                      <input
                        class="pv-campo pv-cifra text-right text-sm"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="—"
                        [attr.aria-label]="'Stock de ' + etiquetaCombo(combo)"
                        [ngModel]="combo.stock ?? null"
                        (ngModelChange)="cambiarVariante(combo.id, 'stock', $event)"
                      />
                      <div class="pv-campo-moneda">
                        <span aria-hidden="true">S/</span>
                        <input
                          class="pv-cifra"
                          type="number"
                          min="0"
                          step="0.10"
                          placeholder="igual"
                          [attr.aria-label]="'Precio propio de ' + etiquetaCombo(combo)"
                          [ngModel]="combo.precio ?? null"
                          (ngModelChange)="cambiarVariante(combo.id, 'precio', $event)"
                        />
                      </div>
                    </div>
                  }
                  <p class="text-tenue mt-1 text-xs">
                    {{ combinaciones().length }} combinaciones · {{ unidadesEnVariantes() }} prendas
                    en total. En blanco es «no se trabaja», no cero.
                  </p>
                </div>
              }
            </section>
          }

          <!-- 5. Ejemplares: series o lotes, según el rubro -->
          @if (forma(); as forma) {
            <section>
              <div class="mb-2 flex items-center justify-between gap-3">
                <p class="pv-etiqueta text-tenue">{{ forma.etiqueta }}</p>
                <button class="pv-boton-menudo" type="button" (click)="anadirEjemplar()">
                  <km-icono nombre="mas" tamano="xs" />
                  {{ forma.singular }}
                </button>
              </div>
              @if (forma.ayuda) {
                <p class="text-tenue mb-2 text-xs">{{ forma.ayuda }}</p>
              }

              <div class="flex flex-col gap-1.5">
                @for (ej of ejemplares(); track $index; let i = $index) {
                  <div
                    class="pv-tabla-ejemplar"
                    [class.pv-tabla-ejemplar-simple]="!forma.conVencimiento && !forma.conCantidad"
                  >
                    <div class="pv-campo-icono">
                      <km-icono [nombre]="forma.conVencimiento ? 'lote' : 'serie'" />
                      <input
                        class="pv-cifra"
                        type="text"
                        [placeholder]="forma.singular"
                        [attr.aria-label]="forma.singular + ' ' + (i + 1)"
                        [ngModel]="ej.codigo"
                        (ngModelChange)="cambiarEjemplar(i, 'codigo', $event)"
                      />
                    </div>

                    @if (forma.conVencimiento) {
                      <input
                        class="pv-campo pv-cifra text-sm"
                        type="date"
                        [attr.aria-label]="'Vencimiento del lote ' + (i + 1)"
                        [ngModel]="ej.vence ?? ''"
                        (ngModelChange)="cambiarEjemplar(i, 'vence', $event)"
                      />
                    }

                    @if (forma.conCantidad) {
                      <input
                        class="pv-campo pv-cifra text-right text-sm"
                        type="number"
                        min="0"
                        step="1"
                        [attr.aria-label]="'Unidades del lote ' + (i + 1)"
                        [ngModel]="ej.cantidad"
                        (ngModelChange)="cambiarEjemplar(i, 'cantidad', $event)"
                      />
                    }

                    <button
                      class="pv-boton-icono pv-boton-icono-peligro"
                      type="button"
                      [attr.aria-label]="'Quitar ' + forma.singular + ' ' + (i + 1)"
                      title="Quitar"
                      (click)="quitarEjemplar(i)"
                    >
                      <km-icono nombre="eliminar" />
                    </button>
                  </div>
                } @empty {
                  <p class="text-tenue text-xs">Ninguno registrado.</p>
                }
              </div>

              @if (ejemplares().length > 0) {
                <p class="text-tenue mt-2 text-xs">
                  Suman {{ unidadesEnEjemplares() }} de {{ stock ?? 0 }} en existencias.
                </p>
              }
            </section>
          }

          <!-- 6. Ficha -->
          <section>
            <div class="mb-2 flex items-center justify-between gap-3">
              <p class="pv-etiqueta text-tenue">Ficha</p>
              <button class="pv-boton-menudo" type="button" (click)="anadirCampo()">
                <km-icono nombre="mas" tamano="xs" />
                Dato
              </button>
            </div>
            <p class="text-tenue mb-2 text-xs">Lo que se contesta cuando el cliente pregunta.</p>

            <div class="flex flex-col gap-1.5">
              @for (campo of ficha(); track $index; let i = $index) {
                <div class="pv-ficha-fila">
                  <input
                    class="pv-campo text-sm"
                    type="text"
                    placeholder="Etiqueta"
                    [attr.aria-label]="'Etiqueta del dato ' + (i + 1)"
                    [ngModel]="campo.etiqueta"
                    (ngModelChange)="cambiarFicha(i, 'etiqueta', $event)"
                  />
                  <input
                    class="pv-campo text-sm"
                    type="text"
                    placeholder="Valor"
                    [attr.aria-label]="'Valor del dato ' + (i + 1)"
                    [ngModel]="campo.valor"
                    (ngModelChange)="cambiarFicha(i, 'valor', $event)"
                  />
                  <!-- Marcar un dato como filtrable es lo que lo convierte en
                       faceta del buscador: «Marca» sí, «Composición» no. -->
                  <button
                    class="pv-marca-conmuta"
                    type="button"
                    [class.pv-marca-puesta]="campo.faceta === true"
                    [attr.aria-pressed]="campo.faceta === true"
                    title="Además de verse, este dato filtra en el buscador"
                    (click)="cambiarFicha(i, 'faceta', campo.faceta !== true)"
                  >
                    <km-icono nombre="filtro" tamano="xs" />
                    Filtra
                  </button>
                  <button
                    class="pv-boton-icono pv-boton-icono-peligro"
                    type="button"
                    [attr.aria-label]="'Quitar el dato ' + (i + 1)"
                    title="Quitar"
                    (click)="quitarCampo(i)"
                  >
                    <km-icono nombre="eliminar" />
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
              class="pv-boton pv-boton-peligro"
              type="button"
              (click)="eliminar.emit(existente.id)"
            >
              <km-icono nombre="eliminar" />
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
            <km-icono nombre="guardar" />
            Guardar
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
  protected readonly ejemplares = signal<EjemplarProducto[]>([])

  /*
   * Cómo llama ESTE rubro a lo que identifica un ejemplar. Nulo donde no
   * aplica —en ropa identifica la variante, no un número— y entonces la
   * sección no se pinta.
   */
  private readonly perfil = inject(PerfilService)
  protected readonly forma = this.perfil.formaEjemplar
  protected readonly ejes = this.perfil.ejes
  protected readonly ejemplo = this.perfil.ejemplo

  /* Qué valores de cada eje trabaja ESTE producto. La matriz sale de aquí. */
  protected readonly elegidos = signal<Record<string, string[]>>({})
  /* Valores que el negocio añadió a mano, además de los sugeridos. */
  protected readonly propios = signal<Record<string, string[]>>({})
  protected readonly nuevoValor = signal<Record<string, string>>({})
  protected readonly variantes = signal<VarianteProducto[]>([])

  /**
   * El producto cartesiano de lo marcado, conservando lo ya tecleado.
   *
   * Se recalcula al marcar o desmarcar un valor, y una combinación que
   * sigue existiendo conserva su stock y su precio: desmarcar «XL» por
   * error y volver a marcarlo no puede borrar las cuentas de las demás.
   */
  protected readonly combinaciones = computed<VarianteProducto[]>(() => {
    const ejes = this.ejes().filter((eje) => (this.elegidos()[eje.clave] ?? []).length > 0)
    if (ejes.length === 0) return []

    let filas: Record<string, string>[] = [{}]
    for (const eje of ejes) {
      const valores = this.elegidos()[eje.clave] ?? []
      filas = filas.flatMap((fila) => valores.map((valor) => ({ ...fila, [eje.clave]: valor })))
    }

    const previas = new Map(this.variantes().map((v) => [this.claveDe(v.atributos), v]))
    return filas.map((atributos) => {
      const clave = this.claveDe(atributos)
      const previa = previas.get(clave)
      return { id: previa?.id ?? clave, atributos, stock: previa?.stock, precio: previa?.precio }
    })
  })

  protected readonly unidadesEnVariantes = computed(() =>
    this.combinaciones().reduce((suma, v) => suma + (v.stock ?? 0), 0),
  )

  /** Una combinación se identifica por sus valores, en orden de eje. */
  private claveDe(atributos: Readonly<Record<string, string>>): string {
    return this.ejes()
      .map((eje) => atributos[eje.clave] ?? '')
      .join('|')
  }

  protected readonly unidadesEnEjemplares = computed(() =>
    this.ejemplares().reduce((suma, ej) => suma + (ej.cantidad || 0), 0),
  )

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
    this.ejemplares.set((actual.ejemplares ?? []).map((ej) => ({ ...ej })))
    this.variantes.set((actual.variantes ?? []).map((v) => ({ ...v })))

    // Lo que el producto YA trabaja se marca solo, incluidos los valores
    // que no están entre los sugeridos: una talla que el negocio inventó
    // no puede desaparecer al reabrir la ficha.
    const marcados: Record<string, string[]> = {}
    for (const eje of actual.ejes ?? []) marcados[eje.clave] = [...eje.valores]
    this.elegidos.set(marcados)

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
    const codigos = this.ejemplares()
      .map((ej) => ej.codigo.trim())
      .filter(Boolean)
    if (new Set(codigos).size !== codigos.length) {
      const nombre = this.forma()?.singular ?? 'ejemplar'
      return `Hay un ${nombre.toLowerCase()} repetido: dos iguales son uno contado dos veces.`
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

  // ── Variantes ───────────────────────────────────────────────────────────

  /** Los sugeridos del rubro más los que haya escrito el negocio. */
  protected valoresDe(eje: { clave: string; sugeridos: readonly string[] }): string[] {
    const extra = this.propios()[eje.clave] ?? []
    const marcados = this.elegidos()[eje.clave] ?? []
    const todos = [...eje.sugeridos, ...extra]
    // Un valor marcado que ya no figura —viene de un producto antiguo— se
    // añade al final en vez de desaparecer con su stock detrás.
    for (const valor of marcados) if (!todos.includes(valor)) todos.push(valor)
    return todos
  }

  protected tiene(clave: string, valor: string): boolean {
    return (this.elegidos()[clave] ?? []).includes(valor)
  }

  protected alternarValor(clave: string, valor: string): void {
    this.guardarVariantes()
    this.elegidos.update((actual) => {
      const puestos = actual[clave] ?? []
      return {
        ...actual,
        [clave]: puestos.includes(valor)
          ? puestos.filter((otro) => otro !== valor)
          : [...puestos, valor],
      }
    })
    this.tocar()
  }

  protected escribirNuevoValor(clave: string, valor: string): void {
    this.nuevoValor.update((actual) => ({ ...actual, [clave]: valor }))
  }

  protected anadirValor(clave: string): void {
    const valor = (this.nuevoValor()[clave] ?? '').trim()
    if (!valor) return
    this.propios.update((actual) => {
      const previos = actual[clave] ?? []
      return previos.includes(valor) ? actual : { ...actual, [clave]: [...previos, valor] }
    })
    this.nuevoValor.update((actual) => ({ ...actual, [clave]: '' }))
    // Se añade YA marcado: nadie escribe una talla para luego no usarla.
    if (!this.tiene(clave, valor)) this.alternarValor(clave, valor)
  }

  protected cambiarVariante(id: string, campo: 'stock' | 'precio', valor: unknown): void {
    const numero = valor === null || valor === '' ? undefined : Math.max(0, Number(valor) || 0)
    this.variantes.set(
      this.combinaciones().map((v) => (v.id === id ? { ...v, [campo]: numero } : v)),
    )
    this.tocar()
  }

  protected etiquetaCombo(combo: VarianteProducto): string {
    return Object.values(combo.atributos).join(' · ')
  }

  /** Vuelca lo calculado al estado antes de que cambie la lista de ejes. */
  private guardarVariantes(): void {
    this.variantes.set(this.combinaciones())
  }

  protected anadirEjemplar(): void {
    // Una serie es un aparato: arranca en 1 y no se toca. Un lote arranca
    // en 1 también, porque un lote vacío no se registra.
    this.ejemplares.update((lista) => [...lista, { codigo: '', cantidad: 1 }])
    this.tocar()
  }

  protected quitarEjemplar(indice: number): void {
    this.ejemplares.update((lista) => lista.filter((_, i) => i !== indice))
    this.tocar()
  }

  protected cambiarEjemplar(
    indice: number,
    campo: 'codigo' | 'vence' | 'cantidad',
    valor: unknown,
  ): void {
    this.ejemplares.update((lista) =>
      lista.map((ej, i) => {
        if (i !== indice) return ej
        if (campo === 'cantidad') return { ...ej, cantidad: Math.max(0, Number(valor) || 0) }
        if (campo === 'vence') return { ...ej, vence: String(valor) || undefined }
        return { ...ej, codigo: String(valor) }
      }),
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

  protected cambiarFicha(
    indice: number,
    campo: 'etiqueta' | 'valor' | 'faceta',
    valor: string | boolean,
  ): void {
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
      // Un ejemplar sin número no identifica nada: se descarta en vez de
      // guardarse en blanco y aparecer luego como opción vacía al vender.
      ejemplares: this.ejemplares().filter((ej) => ej.codigo.trim()),
      ...this.variantesAGuardar(),
    })
  }

  /**
   * Los ejes y las variantes, listos para el catálogo.
   *
   * Solo se guardan las combinaciones con stock DECLARADO: una celda en
   * blanco significa «no se trabaja», y guardarla como cero la convertiría
   * en «agotada, se repone», que es otra respuesta en el mostrador.
   */
  private variantesAGuardar(): Pick<ProductoRef, 'ejes' | 'variantes'> {
    const ejes = this.ejes()
      .map((eje) => ({
        clave: eje.clave,
        etiqueta: eje.etiqueta,
        valores: this.valoresDe(eje).filter((valor) => this.tiene(eje.clave, valor)),
      }))
      .filter((eje) => eje.valores.length > 0)
    if (ejes.length === 0) return {}

    return {
      ejes,
      variantes: this.combinaciones().filter((v) => v.stock !== undefined),
    }
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
