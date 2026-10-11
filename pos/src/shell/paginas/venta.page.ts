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
import type { CategoriaRef, PresentacionVenta, ProductoRef } from '@pos-core/index'
import { categoriasDelCatalogo } from '@pos-adaptadores/simulado/index'
import {
  IconoProductoComponent,
  MonedaPipe,
  PUERTO_CATALOGO,
  TicketService,
} from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'

/**
 * Zona de venta.
 *
 * La mitad izquierda del mostrador: buscar y elegir. La derecha —ticket,
 * totales y cobro— la pone el shell y es igual para todos los rubros.
 *
 * Está pensada para MANOS EN EL TECLADO, que es como se opera una caja con
 * cola: se escribe en el buscador y nunca se sale de él. Las flechas mueven
 * por producto y por presentación, y Entrar agrega. Soltar el escáner para
 * buscar el ratón es lo que hace lenta una venta.
 *
 * Es deliberadamente genérica: en el hito 3 cada perfil la reemplaza por la
 * suya —tarjetas con foto y matriz de talla en ropa, sustitutos y lote en
 * farmacia—. Lo que no cambia es el gesto: escanear o escribir.
 */
@Component({
  selector: 'km-venta-page',
  imports: [FormsModule, MonedaPipe, IconoProductoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'atajo($event)' },
  template: `
    <div class="pv-fade-in flex h-full flex-col gap-3">
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            #campo
            class="pv-campo pr-16 text-base"
            type="search"
            placeholder="Escanea un código o escribe para buscar…"
            aria-label="Buscar producto"
            autocomplete="off"
            [ngModel]="texto()"
            (ngModelChange)="buscar($event)"
          />
          <kbd class="pv-kbd absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">/</kbd>
        </div>
        <button class="pv-boton pv-boton-tenue" type="button" disabled>Cliente</button>
      </div>

      <!-- Categorías. Filtran de verdad, así que son botones y no adorno. -->
      <div class="flex shrink-0 gap-1.5 overflow-x-auto pb-0.5">
        <button
          class="pv-chip"
          type="button"
          [class.pv-chip-activo]="!categoria()"
          (click)="filtrar(null)"
        >
          Todo
          <span class="pv-chip-cuenta">{{ totalCatalogo }}</span>
        </button>
        @for (grupo of categorias; track grupo.categoria.codigo) {
          <button
            class="pv-chip"
            type="button"
            [class.pv-chip-activo]="categoria() === grupo.categoria.codigo"
            (click)="filtrar(grupo.categoria)"
          >
            {{ grupo.categoria.nombre }}
            <span class="pv-chip-cuenta">{{ grupo.cuantos }}</span>
          </button>
        }
      </div>

      <div class="pv-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        @if (resultados().length === 0) {
          <div class="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <p class="text-tenue text-sm">
              {{ buscando() ? 'Buscando…' : 'Sin resultados para «' + texto() + '»' }}
            </p>
            @if (!buscando()) {
              <p class="text-tenue text-xs">
                Prueba con «paracetamol», «ibu» o un código de barras.
              </p>
            }
          </div>
        } @else {
          @if (!texto()) {
            <p class="pv-etiqueta text-tenue border-b border-linea px-4 py-2">Frecuentes</p>
          }

          <!-- Lista densa: una fila por producto, dos renglones. Entra el
               doble de catálogo en la misma pantalla que con tarjetas, y en
               una botica el catálogo es largo. -->
          <ul class="min-h-0 flex-1 overflow-auto" role="listbox" aria-label="Resultados">
            @for (producto of resultados(); track producto.id; let i = $index) {
              <li
                class="pv-fila"
                role="option"
                [class.pv-fila-activa]="i === fila()"
                [attr.aria-selected]="i === fila()"
                (mouseenter)="fila.set(i)"
              >
                <!--
                  Dos columnas y no una. Apilado, el producto ocupaba el
                  tercio izquierdo y el resto de la fila quedaba en blanco,
                  y cada producto se comía el doble de alto. Con el nombre a
                  la izquierda y los precios alineados a la derecha, la
                  columna de precios se lee en vertical de un vistazo, que
                  es como se compara.
                -->
                <div class="pv-fila-rejilla">
                  <km-icono-producto [clave]="producto.icono" [tamano]="38" />

                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold">{{ producto.descripcion }}</p>
                    <p class="text-tenue flex items-center gap-1.5 truncate text-xs">
                      @if (producto.nota) {
                        <span class="truncate">{{ sinReceta(producto.nota) }}</span>
                      }
                      @if (exigeReceta(producto)) {
                        <span class="pv-receta">receta</span>
                      }
                      <span class="pv-cifra text-[11px] opacity-60">
                        · {{ producto.codigoBarras }}
                      </span>
                    </p>
                  </div>

                  <!-- La presentación ES el precio: elegirla es la acción,
                       no un paso previo. Por eso va en la fila y no en un
                       diálogo aparte. -->
                  <div class="flex flex-wrap justify-end gap-1.5">
                    @for (pres of producto.presentaciones; track pres.id; let j = $index) {
                      <button
                        class="pv-pres"
                        type="button"
                        [class.pv-pres-activa]="i === fila() && j === presentacion()"
                        (click)="agregar(producto, pres)"
                        (mouseenter)="presentacion.set(j)"
                      >
                        <span>{{ pres.unidad.nombre }}</span>
                        <span class="pv-cifra font-semibold">
                          {{ pres.precio | moneda: false }}
                        </span>
                        @if (pres.igvTasa === 0) {
                          <span class="pv-exonerado">exon</span>
                        }
                      </button>
                    }
                  </div>
                </div>
              </li>
            }
          </ul>

          <!-- Las teclas van en el panel de «?», no repetidas en cada
               pantalla: con siete módulos, imprimirlas en todas es ruido. -->
          <div
            class="text-tenue flex shrink-0 items-center gap-4 border-t border-linea px-4 py-2 text-[11px]"
          >
            <span><kbd class="pv-kbd">↑</kbd><kbd class="pv-kbd">↓</kbd> producto</span>
            <span><kbd class="pv-kbd">←</kbd><kbd class="pv-kbd">→</kbd> presentación</span>
            <span><kbd class="pv-kbd">Enter</kbd> agregar</span>
            <span class="ml-auto"><kbd class="pv-kbd">?</kbd> atajos</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class VentaPage {
  private readonly catalogo = inject(PUERTO_CATALOGO)
  private readonly sesion = inject(SesionStore)
  private readonly ticket = inject(TicketService)

  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo')

  protected readonly categorias = categoriasDelCatalogo()
  protected readonly totalCatalogo = this.categorias.reduce((s, g) => s + g.cuantos, 0)

  protected readonly texto = signal('')
  protected readonly categoria = signal<string | null>(null)
  protected readonly resultados = signal<ProductoRef[]>([])
  protected readonly buscando = signal(false)

  /** Fila y presentación resaltadas. Las mueven las flechas y el puntero. */
  protected readonly fila = signal(0)
  protected readonly presentacion = signal(0)

  private readonly activo = computed(() => this.resultados()[this.fila()] ?? null)

  /** Marca la búsqueda en curso: si llega tarde, su respuesta se descarta. */
  private ultimaBusqueda = 0

  constructor() {
    void this.buscar('')
  }

  protected async buscar(texto: string): Promise<void> {
    this.texto.set(texto)
    const mia = ++this.ultimaBusqueda
    this.buscando.set(true)

    const sucursalId = this.sesion.sucursal()?.id ?? ''
    const hallados = await this.catalogo.buscar({
      texto,
      sucursalId,
      categoria: this.categoria() ?? undefined,
      limite: 12,
    })

    // Escribir rápido lanza varias búsquedas y no llegan en orden: sin esto,
    // una respuesta lenta de «para» pisaría la de «paracetamol».
    if (mia !== this.ultimaBusqueda) return

    this.resultados.set(hallados)
    this.fila.set(0)
    this.presentacion.set(0)
    this.buscando.set(false)

    // Un código de barras devuelve un único producto: se agrega solo. El
    // escáner ya es la confirmación; pedir otra sobra.
    if (hallados.length === 1 && /^\d{8,}$/.test(texto.trim())) {
      this.agregar(hallados[0], hallados[0].presentaciones[0])
      this.limpiar()
    }
  }

  protected filtrar(categoria: CategoriaRef | null): void {
    this.categoria.set(categoria?.codigo ?? null)
    void this.buscar(this.texto())
  }

  /** La nota trae «… · exige receta»; el badge lo dice mejor que el texto. */
  protected exigeReceta(producto: ProductoRef): boolean {
    return producto.nota?.includes('exige receta') === true
  }

  protected sinReceta(nota: string): string {
    return nota.replace(' · exige receta', '')
  }

  protected agregar(producto: ProductoRef, pres: PresentacionVenta): void {
    this.ticket.agregarLinea({
      productoId: producto.id,
      descripcion: producto.descripcion,
      unidad: pres.unidad,
      factorAlmacen: pres.factorAlmacen,
      cantidad: 1,
      precioUnitario: pres.precio,
      igvTasa: pres.igvTasa,
      icono: producto.icono,
      atributos: {},
    })
  }

  /**
   * Teclado.
   *
   * Se captura en el documento y no en el campo porque el foco puede haberse
   * ido a un botón tras un clic, y el cajero sigue escribiendo igual. Las
   * flechas no mueven el cursor dentro del buscador: ahí no hay nada que
   * recorrer, y sí una lista.
   */
  protected atajo(evento: KeyboardEvent): void {
    // «/» enfoca el buscador, como en tantas herramientas. Las teclas de
    // función las intercepta el navegador antes de que lleguen aquí.
    if (evento.key === '/' && !this.enCampo(evento)) {
      evento.preventDefault()
      this.enfocar()
      return
    }

    const total = this.resultados().length
    if (total === 0) return

    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault()
        this.moverFila(1)
        break
      case 'ArrowUp':
        evento.preventDefault()
        this.moverFila(-1)
        break
      case 'ArrowRight':
        evento.preventDefault()
        this.moverPresentacion(1)
        break
      case 'ArrowLeft':
        evento.preventDefault()
        this.moverPresentacion(-1)
        break
      case 'Enter': {
        const producto = this.activo()
        const pres = producto?.presentaciones[this.presentacion()]
        if (!producto || !pres) return
        evento.preventDefault()
        this.agregar(producto, pres)
        break
      }
      case 'Escape':
        evento.preventDefault()
        this.limpiar()
        break
    }
  }

  private enCampo(evento: KeyboardEvent): boolean {
    const destino = evento.target as HTMLElement | null
    return destino?.matches('input, textarea, select') === true
  }

  private moverFila(paso: number): void {
    const total = this.resultados().length
    this.fila.update((actual) => (actual + paso + total) % total)
    this.presentacion.set(0)
    this.desplazarAVista()
  }

  private moverPresentacion(paso: number): void {
    const total = this.activo()?.presentaciones.length ?? 0
    if (total === 0) return
    this.presentacion.update((actual) => (actual + paso + total) % total)
  }

  private desplazarAVista(): void {
    queueMicrotask(() => {
      document
        .querySelector('.pv-fila-activa')
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }

  private limpiar(): void {
    void this.buscar('')
    this.enfocar()
  }

  private enfocar(): void {
    this.campo()?.nativeElement.focus()
    this.campo()?.nativeElement.select()
  }
}
