import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core'
import type { ElementRef } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { nivelDeStock, type NivelStock, type ProductoRef } from '@pos-core/index'

import {
  IconoProductoComponent,
  MonedaPipe,
  PUERTO_CATALOGO,
  PUERTO_MANTENIMIENTO_CATALOGO,
  IconoComponent,
  BotonIconoComponent,
  PestanasComponent,
} from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'
import { FichaProductoComponent } from './ficha-producto.component'
import type { Pestana } from '@pos-core-ui/index'
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
    BotonIconoComponent,
    PestanasComponent,
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
            {{ hallados().length }}
            {{ hallados().length === 1 ? 'producto' : 'productos' }} · {{ agotados() }}
            {{ agotados() === 1 ? 'agotado' : 'agotados' }} · {{ porReponer() }} por reponer
          </p>
        </div>
        <!--
          Lo frecuente con palabra, lo ocasional con icono.

          «Carga masiva» y «Nuevo producto» eran dos botones de dos líneas
          del mismo tamaño, y no son lo mismo: el alta de uno en uno pasa a
          diario y la carga de un Excel pasa el día que se abre la tienda.
          Dar el mismo peso visual a los dos obliga a leer ambos cada vez.

          La carga se queda en icono de hoja de cálculo con su globo —la
          rejilla dice «esto va en Excel» sin escribirlo—, y el alta se
          queda con el signo y una palabra.
        -->
        <div class="flex items-center gap-2">
          <div class="pv-campo-icono w-56">
            <km-icono nombre="buscar" />
            <input
              type="search"
              placeholder="Buscar en el catálogo…"
              aria-label="Buscar en el catálogo"
              [ngModel]="texto()"
              (ngModelChange)="buscar($event)"
            />
          </div>

          <km-boton-icono
            icono="hoja"
            etiqueta="Carga masiva desde Excel"
            tamano="md"
            (pulsar)="cargando.set(true)"
          />

          <button class="pv-boton pv-boton-accion" type="button" (click)="nuevo()">
            <km-icono nombre="mas" />
            Nuevo
          </button>
        </div>
      </header>

      <!-- Pestañas y no pastillas: esto parte el catálogo en secciones, no
           añade una condición a una búsqueda. Y cada una dice cuántos hay,
           porque una pestaña con cero no se pulsa. -->
      <km-pestanas
        class="shrink-0"
        etiqueta="Estado del stock"
        [pestanas]="pestanas()"
        [(activa)]="estado"
      />

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
                <th class="w-28"></th>
                <th class="text-right">Presentaciones</th>
                <th class="w-20"></th>
              </tr>
            </thead>
            <tbody>
              @for (producto of productos(); track producto.id) {
                <tr [class.pv-fila-agotada]="nivel(producto) === 'agotado'">
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
                        [class.text-error]="nivel(producto) === 'agotado'"
                        [class.text-aviso]="nivel(producto) === 'bajo'"
                      >
                        {{ producto.stock }}
                      </span>
                      <span class="text-tenue text-[11px]">
                        {{ producto.unidadAlmacen.abreviatura }}
                      </span>
                    }
                  </td>

                  <!--
                    Ajuste rápido del stock, en la fila.

                    Llegan cinco cajas y lo que había era abrir el editor
                    entero, buscar el campo, sumar de cabeza y guardar. Aquí
                    se escribe lo que ENTRA o lo que SALE —no el total—,
                    porque eso es lo que la persona tiene delante: un albarán
                    de cinco, no el inventario entero.
                  -->
                  <td class="w-28">
                    @if (ajustando() === producto.id) {
                      <div class="flex items-center gap-1">
                        <input
                          #campoAjuste
                          class="pv-campo pv-cifra h-8 w-16 text-right text-sm"
                          type="number"
                          step="1"
                          placeholder="±0"
                          [attr.aria-label]="
                            'Unidades que entran o salen de ' + producto.descripcion
                          "
                          [(ngModel)]="movimiento"
                          (keydown.enter)="aplicarAjuste(producto)"
                          (keydown.escape)="ajustando.set(null)"
                        />
                        <km-boton-icono
                          icono="check"
                          etiqueta="Aplicar"
                          [contexto]="producto.descripcion"
                          [deshabilitado]="!movimiento"
                          (pulsar)="aplicarAjuste(producto)"
                        />
                      </div>
                    } @else {
                      <km-boton-icono
                        icono="movimiento"
                        etiqueta="Entrada o salida de stock"
                        [contexto]="producto.descripcion"
                        (pulsar)="abrirAjuste(producto)"
                      />
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
                  <td colspan="8" class="text-tenue py-10 text-center text-sm">
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
  private readonly inyector = inject(Injector)
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

  /*
   * Lo hallado por el TEXTO, sin filtrar por estado. El estado se aplica
   * aquí, en la pantalla, y no en la consulta: así cada pestaña puede
   * decir cuántos hay sin pedir cuatro búsquedas más al puerto, y las
   * cuentas no dependen de cuál esté abierta.
   */
  protected readonly hallados = signal<ProductoRef[]>([])

  protected readonly productos = computed(() =>
    this.hallados().filter((producto) => this.enEstado(producto, this.estado())),
  )

  /** Las mismas secciones, con cuántos productos tiene cada una ahora. */
  protected readonly pestanas = computed<Pestana[]>(() =>
    this.estados.map((opcion) => ({
      ...opcion,
      cuantos: this.hallados().filter((p) => this.enEstado(p, opcion.valor)).length,
    })),
  )

  /** La misma regla que publica el catálogo como faceta de disponibilidad. */
  private enEstado(producto: ProductoRef, valor: string): boolean {
    return !valor || nivelDeStock(producto.stock) === valor
  }

  protected nivel(producto: ProductoRef): NivelStock {
    return nivelDeStock(producto.stock)
  }
  protected readonly ficha = signal<ProductoRef | null>(null)
  protected readonly editando = signal(false)
  protected readonly enEdicion = signal<ProductoRef | null>(null)
  protected readonly cargando = signal(false)

  /** El producto cuyo stock se está ajustando desde la fila. */
  protected readonly ajustando = signal<string | null>(null)
  protected movimiento: number | null = null

  private readonly campoAjuste = viewChild<ElementRef<HTMLInputElement>>('campoAjuste')

  private readonly carga = viewChild<CargaMasivaComponent>('carga')

  /* Sobre TODO lo hallado, no sobre la pestaña abierta: el resumen de la
     cabecera tiene que decir lo mismo esté donde esté el cajero. */
  protected readonly agotados = computed(() => this.cuantosEn('agotado'))
  protected readonly porReponer = computed(() => this.cuantosEn('bajo'))

  private cuantosEn(nivel: NivelStock): number {
    return this.hallados().filter((p) => nivelDeStock(p.stock) === nivel).length
  }

  constructor() {
    void this.cargar()
  }

  private async cargar(): Promise<void> {
    const filtros: Record<string, readonly string[]> = {}
    this.hallados.set(
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

  protected abrirAjuste(producto: ProductoRef): void {
    this.movimiento = null
    this.ajustando.set(producto.id)
    // El foco al campo: quien pulsa el icono viene a teclear un número.
    afterNextRender(() => this.campoAjuste()?.nativeElement.focus(), {
      injector: this.inyector,
    })
  }

  /**
   * Aplica la entrada o la salida.
   *
   * El puerto recibe el MOVIMIENTO, no el total, y es a propósito: dos
   * personas recibiendo mercadería a la vez con el total se pisan —la
   * segunda guarda lo que vio al abrir—, y con el movimiento se suman.
   */
  protected async aplicarAjuste(producto: ProductoRef): Promise<void> {
    const unidades = Number(this.movimiento)
    if (!Number.isFinite(unidades) || unidades === 0) {
      this.ajustando.set(null)
      return
    }
    await this.mantenimiento.ajustarStock(this.sesion.sucursal()?.id ?? '', producto.id, unidades)
    this.ajustando.set(null)
    this.movimiento = null
    await this.cargar()
  }

  /** Lee un dato de la ficha sin que la tabla sepa de farmacia. */
  protected campo(producto: ProductoRef, etiqueta: string): string {
    return producto.ficha?.find((campo) => campo.etiqueta === etiqueta)?.valor ?? '—'
  }
}
