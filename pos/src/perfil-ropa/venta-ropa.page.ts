import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { ElementRef } from '@angular/core'
import type { Faceta, FiltrosCatalogo, ProductoRef } from '@pos-core/index'
import {
  ContextoVenta,
  FiltrosComponent,
  IconoProductoComponent,
  MonedaPipe,
  PUERTO_CATALOGO,
  TicketService,
} from '@pos-core-ui/index'
import { MatrizVariantesComponent, type EleccionVariante } from './matriz.component'

/**
 * Zona de venta de una tienda de ropa.
 *
 * Es la pantalla propia del perfil, y existe porque el gesto de venta es
 * OTRO. En una botica se busca un producto y se agrega; aquí el cliente
 * llega con la prenda en la mano o señalando el maniquí, y la pregunta no
 * es cuál es, es SI HAY en su talla.
 *
 * De ahí la forma: tarjetas grandes a la izquierda —se reconoce por la
 * foto, no por el nombre— y la matriz completa del producto elegido a la
 * derecha, siempre visible. El vendedor contesta «en M solo queda blanca»
 * mirando, sin tocar nada.
 *
 * Y de ahí la forma de los filtros: ABIERTOS, no tras un botón. La talla y
 * el color no son un refinamiento de la búsqueda, son la búsqueda, y el
 * panel plegado de la pantalla genérica aquí sería esconder la pantalla.
 *
 * Lo que NO tiene es ficha en un diálogo aparte. La composición y los
 * cuidados van bajo la matriz, porque en ropa esa pregunta se hace en el
 * 100 % de las ventas y esconderla tras un botón es hacerla cara.
 */
@Component({
  selector: 'km-venta-ropa-page',
  imports: [
    FormsModule,
    MonedaPipe,
    IconoProductoComponent,
    FiltrosComponent,
    MatrizVariantesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'atajo($event)' },
  template: `
    <div class="pv-operacion pv-fade-in grid h-full gap-3 lg:grid-cols-[1fr_22rem]">
      <!-- Catálogo -->
      <div class="flex min-h-0 flex-col gap-3">
        <div class="relative w-full max-w-[42rem]">
          <input
            #campo
            class="pv-campo pr-16 text-base"
            type="search"
            placeholder="Busca por prenda, color o código…"
            aria-label="Buscar prenda"
            autocomplete="off"
            [ngModel]="texto()"
            (ngModelChange)="buscar($event)"
          />
          <kbd class="pv-kbd absolute top-1/2 right-3 -translate-y-1/2" aria-hidden="true">/</kbd>
        </div>

        <!--
          Los filtros van ABIERTOS, no plegados, y es la diferencia con la
          pantalla genérica. En una botica el 90 % es escanear y el panel
          estorba; aquí la pregunta del cliente ES el filtro —«¿hay en M?»,
          «¿lo tienen en negro?»—, así que esconderlo tras un botón sería
          esconder la pantalla.

          Antes esta pantalla no tenía ninguno: solo un campo de texto, y
          buscar «M» en una tienda de ropa no encuentra nada.
        -->
        <km-filtros
          [facetas]="facetas()"
          [(filtros)]="filtros"
          [plegable]="false"
          (cambio)="refiltrar()"
        />

        <div class="pv-panel flex min-h-0 flex-1 flex-col overflow-hidden">
          @if (resultados().length === 0) {
            <div class="flex flex-1 items-center justify-center p-8">
              <p class="text-tenue text-sm">
                {{ buscando() ? 'Buscando…' : 'Nada que coincida' }}
              </p>
            </div>
          } @else {
            <ul class="pv-perchero" role="listbox" aria-label="Prendas">
              @for (producto of resultados(); track producto.id) {
                <li>
                  <button
                    class="pv-percha"
                    type="button"
                    role="option"
                    [class.pv-percha-activa]="producto.id === elegido()?.id"
                    [attr.aria-selected]="producto.id === elegido()?.id"
                    (click)="abrir(producto)"
                  >
                    <km-icono-producto [clave]="producto.icono" [tamano]="52" />
                    <span class="min-w-0 flex-1 text-left">
                      <span class="line-clamp-2 text-sm leading-snug font-semibold">
                        {{ producto.descripcion }}
                      </span>
                      <span class="text-tenue mt-0.5 block truncate text-xs">
                        {{ producto.nota }}
                      </span>
                      <span class="mt-1.5 flex items-center gap-2">
                        <span class="pv-cifra text-sm font-bold">
                          {{ producto.presentaciones[0].precio | moneda: false }}
                        </span>
                        @if ((producto.stock ?? 0) === 0) {
                          <span class="pv-marca-agotado">agotado</span>
                        } @else {
                          <span class="text-tenue text-[11px]">{{ producto.stock }} en tienda</span>
                        }
                      </span>
                    </span>
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      </div>

      <!-- Matriz de la prenda elegida -->
      <aside class="pv-panel flex min-h-0 flex-col overflow-hidden">
        @if (elegido(); as producto) {
          <header class="border-linea border-b p-4">
            <p class="text-sm font-semibold">{{ producto.descripcion }}</p>
            <p class="pv-cifra text-tenue text-xs">{{ producto.codigoBarras }}</p>
          </header>

          <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
            @if (producto.ejes?.length) {
              <section>
                <p class="pv-etiqueta text-tenue mb-2">Qué hay en tienda</p>
                <km-matriz-variantes [producto]="producto" (elegida)="agregar(producto, $event)" />
              </section>
            } @else {
              <!-- Talla única: no hay matriz que enseñar. -->
              <button
                class="pv-boton pv-boton-accion w-full justify-center"
                type="button"
                [disabled]="(producto.stock ?? 0) === 0"
                (click)="agregarSuelto(producto)"
              >
                Agregar al ticket
              </button>
            }

            @if (producto.ficha?.length) {
              <section>
                <p class="pv-etiqueta text-tenue mb-2">La prenda</p>
                <dl class="pv-ficha-datos">
                  @for (campo of producto.ficha ?? []; track campo.etiqueta) {
                    <div>
                      <dt>{{ campo.etiqueta }}</dt>
                      <dd>{{ campo.valor }}</dd>
                    </div>
                  }
                </dl>
              </section>
            }
          </div>
        } @else {
          <div class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <p class="text-sm font-semibold">Elige una prenda</p>
            <p class="text-tenue max-w-[14rem] text-xs">
              Aquí verás qué tallas y colores hay en tienda, sin ir al estante.
            </p>
          </div>
        }
      </aside>
    </div>
  `,
})
export class VentaRopaPage {
  private readonly catalogo = inject(PUERTO_CATALOGO)
  private readonly ticket = inject(TicketService)
  private readonly contexto = inject(ContextoVenta)

  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo')

  protected readonly texto = signal('')
  protected readonly filtros = signal<FiltrosCatalogo>({})
  protected readonly facetas = signal<readonly Faceta[]>([])
  protected readonly resultados = signal<ProductoRef[]>([])
  protected readonly buscando = signal(false)
  protected readonly elegido = signal<ProductoRef | null>(null)

  protected readonly hayPrenda = computed(() => this.elegido() !== null)

  private ultimaBusqueda = 0

  constructor() {
    void this.buscar('')
  }

  protected async buscar(texto: string): Promise<void> {
    this.texto.set(texto)
    const mia = ++this.ultimaBusqueda
    this.buscando.set(true)

    const sucursalId = this.contexto.sucursalId()
    const contexto = { texto, filtros: this.filtros() }
    const [hallados, facetas] = await Promise.all([
      this.catalogo.buscar({ ...contexto, sucursalId, limite: 40 }),
      this.catalogo.facetas(sucursalId, contexto),
    ])
    if (mia !== this.ultimaBusqueda) return

    this.facetas.set(facetas)
    this.resultados.set(hallados)
    this.buscando.set(false)

    // La primera prenda queda elegida: con la matriz vacía la mitad
    // derecha no dice nada, y en una tienda eso es media pantalla muerta.
    this.elegido.set(hallados[0] ?? null)
  }

  protected refiltrar(): void {
    void this.buscar(this.texto())
  }

  protected abrir(producto: ProductoRef): void {
    this.elegido.set(producto)
  }

  protected agregar(producto: ProductoRef, eleccion: EleccionVariante): void {
    const presentacion = producto.presentaciones[0]
    this.ticket.agregarLinea({
      productoId: producto.id,
      descripcion: producto.descripcion,
      unidad: presentacion.unidad,
      factorAlmacen: presentacion.factorAlmacen,
      cantidad: 1,
      precioUnitario: eleccion.variante.precio ?? presentacion.precio,
      igvTasa: presentacion.igvTasa,
      icono: producto.icono,
      // La variante viaja en `atributos`: el núcleo no la interpreta, y
      // es lo que permite devolver exactamente la prenda vendida.
      atributos: { ...eleccion.atributos, varianteId: eleccion.variante.id },
    })
  }

  protected agregarSuelto(producto: ProductoRef): void {
    const presentacion = producto.presentaciones[0]
    this.ticket.agregarLinea({
      productoId: producto.id,
      descripcion: producto.descripcion,
      unidad: presentacion.unidad,
      factorAlmacen: presentacion.factorAlmacen,
      cantidad: 1,
      precioUnitario: presentacion.precio,
      igvTasa: presentacion.igvTasa,
      icono: producto.icono,
      atributos: {},
    })
  }

  protected atajo(evento: KeyboardEvent): void {
    const destino = evento.target as HTMLElement | null
    const enCampo = destino?.matches('input, textarea, select') === true
    if (evento.key === '/' && !enCampo) {
      evento.preventDefault()
      this.campo()?.nativeElement.focus()
      this.campo()?.nativeElement.select()
    }
  }
}
