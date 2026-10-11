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
import type {
  Faceta,
  GrupoCategoria,
  OrdenCatalogo,
  PresentacionVenta,
  ProductoRef,
} from '@pos-core/index'
import {
  IconoProductoComponent,
  MonedaPipe,
  PUERTO_CATALOGO,
  TicketService,
} from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'
import { PerfilService } from '../perfiles/perfil.service'
import { FichaProductoComponent, type Agregado } from './ficha-producto.component'

/**
 * Zona de venta.
 *
 * La mitad izquierda del mostrador: buscar y elegir. La derecha —ticket,
 * totales y cobro— la pone el shell y es igual para todos los rubros.
 *
 * REJILLA, no lista. Un mostrador no lee renglones: reconoce objetos. En
 * tarjetas entran el doble por pantalla, el precio «desde» queda en la misma
 * posición en todas y la vista se recorre con los ojos en vez de con la
 * barra de desplazamiento. La lista de una columna dejaba media pantalla en
 * blanco y obligaba a leer para encontrar.
 *
 * FILTROS de verdad, no solo texto. El buscador sirve cuando se sabe qué se
 * busca; cuando el cliente dice «algo para la alergia, de Genfar, sin
 * receta», hace falta filtrar. Las facetas las publica el catálogo y aquí se
 * pintan sin conocerlas, así que el día que el perfil sea ropa aparecerán
 * talla y color sin tocar esta pantalla.
 *
 * Sigue pensada para MANOS EN EL TECLADO: se escribe en el buscador y nunca
 * se sale de él. Las flechas se mueven por la rejilla en dos dimensiones,
 * Entrar agrega la presentación por defecto y la barra espaciadora abre la
 * ficha, que es donde se contesta «¿de qué es?» y «¿me da una sola?».
 */
@Component({
  selector: 'km-venta-page',
  imports: [FormsModule, MonedaPipe, IconoProductoComponent, FichaProductoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'atajo($event)' },
  template: `
    <div class="pv-operacion pv-fade-in flex h-full flex-col gap-3">
      <!-- Buscador y acciones -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            #campo
            class="pv-campo pr-16 text-base"
            type="search"
            placeholder="Escanea un código, o escribe nombre, principio activo o laboratorio…"
            aria-label="Buscar producto"
            autocomplete="off"
            [ngModel]="texto()"
            (ngModelChange)="buscar($event)"
          />
          <kbd class="pv-kbd absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">/</kbd>
        </div>

        <button
          class="pv-boton pv-boton-tenue"
          type="button"
          [class.pv-boton-marcado]="filtrosAbiertos() || cuantosFiltros() > 0"
          [attr.aria-expanded]="filtrosAbiertos()"
          (click)="filtrosAbiertos.set(!filtrosAbiertos())"
        >
          Filtros
          @if (cuantosFiltros() > 0) {
            <span class="pv-chip-cuenta">{{ cuantosFiltros() }}</span>
          }
        </button>

        <button class="pv-boton pv-boton-tenue" type="button" disabled>Cliente</button>
      </div>

      <!-- Categorías: navegación del catálogo, no un filtro más. -->
      <div class="flex shrink-0 gap-1.5 overflow-x-auto pb-0.5">
        <button
          class="pv-chip"
          type="button"
          [class.pv-chip-activo]="!categoria()"
          (click)="filtrar(null)"
        >
          Todo
          <span class="pv-chip-cuenta">{{ totalCatalogo() }}</span>
        </button>
        @for (grupo of categorias(); track grupo.categoria.codigo) {
          <button
            class="pv-chip"
            type="button"
            [class.pv-chip-activo]="categoria() === grupo.categoria.codigo"
            (click)="filtrar(grupo.categoria.codigo)"
          >
            {{ grupo.categoria.nombre }}
            <span class="pv-chip-cuenta">{{ grupo.cuantos }}</span>
          </button>
        }
      </div>

      <!-- Filtros avanzados. Plegados por defecto: el 90 % de las ventas es
           escanear, y una barra permanente robaría dos filas de catálogo. -->
      @if (filtrosAbiertos()) {
        <div class="pv-filtros pv-entra">
          @for (faceta of facetas(); track faceta.clave) {
            <div class="pv-filtro">
              <p class="pv-etiqueta text-tenue mb-1.5">{{ faceta.etiqueta }}</p>
              <div class="flex flex-wrap gap-1">
                @for (opcion of faceta.opciones; track opcion.valor) {
                  <button
                    class="pv-filtro-opcion"
                    type="button"
                    [class.pv-filtro-marcada]="filtros()[faceta.clave] === opcion.valor"
                    (click)="alternar(faceta.clave, opcion.valor)"
                  >
                    {{ opcion.etiqueta }}
                    <span class="opacity-50">{{ opcion.cuantos }}</span>
                  </button>
                }
              </div>
            </div>
          }

          <div class="pv-filtro">
            <p class="pv-etiqueta text-tenue mb-1.5">Ordenar por</p>
            <div class="flex flex-wrap gap-1">
              @for (opcion of ordenes; track opcion.valor) {
                <button
                  class="pv-filtro-opcion"
                  type="button"
                  [class.pv-filtro-marcada]="orden() === opcion.valor"
                  (click)="ordenarPor(opcion.valor)"
                >
                  {{ opcion.etiqueta }}
                </button>
              }
            </div>
          </div>

          @if (cuantosFiltros() > 0) {
            <button class="pv-limpiar" type="button" (click)="limpiarFiltros()">
              Quitar los {{ cuantosFiltros() }} filtros
            </button>
          }
        </div>
      }

      <!-- Rejilla -->
      <div class="pv-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        @if (resultados().length === 0) {
          <div class="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <p class="text-tenue text-sm">
              {{ buscando() ? 'Buscando…' : 'Nada que coincida' }}
            </p>
            @if (!buscando()) {
              <p class="text-tenue text-xs">
                Prueba con menos filtros, o busca «paracetamol», «Genfar» o un código.
              </p>
            }
          </div>
        } @else {
          <div class="flex shrink-0 items-baseline justify-between border-b border-linea px-4 py-2">
            <p class="pv-etiqueta text-tenue">
              {{ texto() || cuantosFiltros() ? 'Resultados' : 'Frecuentes' }}
            </p>
            <p class="text-tenue text-[11px]">{{ resultados().length }} productos</p>
          </div>

          <ul class="pv-rejilla" role="listbox" aria-label="Productos">
            @for (producto of resultados(); track producto.id; let i = $index) {
              <li
                class="pv-tarjeta"
                role="option"
                [class.pv-tarjeta-activa]="i === fila()"
                [class.pv-tarjeta-agotada]="producto.stock === 0"
                [attr.aria-selected]="i === fila()"
                (mouseenter)="fila.set(i)"
              >
                <!-- La cabecera abre la ficha: es donde se contesta de qué
                     es el producto y si se puede vender suelto. -->
                <button class="pv-tarjeta-cabecera" type="button" (click)="verFicha(producto)">
                  <km-icono-producto [clave]="producto.icono" [tamano]="38" />
                  <span class="min-w-0 flex-1 text-left">
                    <span class="line-clamp-2 text-sm leading-snug font-semibold">
                      {{ producto.descripcion }}
                    </span>
                    <span class="text-tenue mt-0.5 block truncate text-xs">
                      {{ perfilRubro.nota(producto) }}
                    </span>
                  </span>
                </button>

                <div class="pv-tarjeta-marcas">
                  @for (marca of perfilRubro.marcas(producto); track marca.texto) {
                    <span class="pv-marca" [attr.data-tono]="marca.tono" [title]="marca.detalle">
                      {{ marca.texto }}
                    </span>
                  }
                  @if (producto.stock === 0) {
                    <span class="pv-marca-agotado">agotado</span>
                  } @else if (producto.stock !== undefined && producto.stock <= 20) {
                    <span class="pv-marca-bajo">quedan {{ producto.stock }}</span>
                  }
                </div>

                <!-- La presentación ES el precio: elegirla es la acción. -->
                <div class="pv-tarjeta-precios">
                  @for (pres of producto.presentaciones; track pres.id; let j = $index) {
                    <button
                      class="pv-pres"
                      type="button"
                      [class.pv-pres-activa]="i === fila() && j === presentacion()"
                      (click)="agregar(producto, pres)"
                      (mouseenter)="presentacion.set(j)"
                    >
                      <span class="truncate">{{ pres.unidad.nombre }}</span>
                      <span class="pv-cifra font-semibold">{{ pres.precio | moneda: false }}</span>
                      @if (pres.fraccionada) {
                        <span class="pv-punto-fraccion" title="Se vende suelta"></span>
                      }
                      @if (pres.igvTasa === 0) {
                        <span class="pv-exonerado">exon</span>
                      }
                    </button>
                  }
                </div>

                <button class="pv-tarjeta-ficha" type="button" (click)="verFicha(producto)">
                  Ver ficha
                </button>
              </li>
            }
          </ul>

          <div
            class="text-tenue flex shrink-0 items-center gap-4 border-t border-linea px-4 py-2 text-[11px]"
          >
            <span><kbd class="pv-kbd">↑</kbd><kbd class="pv-kbd">↓</kbd> fila</span>
            <span><kbd class="pv-kbd">←</kbd><kbd class="pv-kbd">→</kbd> producto</span>
            <span><kbd class="pv-kbd">Enter</kbd> agregar</span>
            <span><kbd class="pv-kbd">Espacio</kbd> ficha</span>
            <span class="ml-auto"><kbd class="pv-kbd">?</kbd> atajos</span>
          </div>
        }
      </div>
    </div>

    @if (ficha(); as abierto) {
      <km-ficha-producto
        [producto]="abierto"
        (cerrar)="ficha.set(null)"
        (agregar)="agregarDesdeFicha(abierto, $event)"
      />
    }
  `,
})
export class VentaPage {
  private readonly catalogo = inject(PUERTO_CATALOGO)
  private readonly sesion = inject(SesionStore)
  protected readonly perfilRubro = inject(PerfilService)
  private readonly ticket = inject(TicketService)

  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo')

  /*
   * Categorías y facetas vienen del PUERTO, no importadas del adaptador.
   * Antes se traían de `@pos-adaptadores/simulado` y eso dejaba la caja
   * enseñando las categorías de la demo el día que entre el back real.
   */
  protected readonly categorias = signal<readonly GrupoCategoria[]>([])
  protected readonly facetas = signal<readonly Faceta[]>([])
  protected readonly totalCatalogo = computed(() =>
    this.categorias().reduce((suma, grupo) => suma + grupo.cuantos, 0),
  )

  protected readonly ordenes: { valor: OrdenCatalogo; etiqueta: string }[] = [
    { valor: 'relevancia', etiqueta: 'Relevancia' },
    { valor: 'nombre', etiqueta: 'Nombre' },
    { valor: 'precio-asc', etiqueta: 'Precio ↑' },
    { valor: 'precio-desc', etiqueta: 'Precio ↓' },
  ]

  protected readonly texto = signal('')
  protected readonly categoria = signal<string | null>(null)
  protected readonly filtros = signal<Record<string, string>>({})
  protected readonly orden = signal<OrdenCatalogo>('relevancia')
  protected readonly filtrosAbiertos = signal(false)
  protected readonly resultados = signal<ProductoRef[]>([])
  protected readonly buscando = signal(false)
  protected readonly ficha = signal<ProductoRef | null>(null)

  /** Producto y presentación resaltados. Los mueven las flechas y el puntero. */
  protected readonly fila = signal(0)
  protected readonly presentacion = signal(0)

  protected readonly cuantosFiltros = computed(() => Object.keys(this.filtros()).length)
  private readonly activo = computed(() => this.resultados()[this.fila()] ?? null)

  /** Marca la búsqueda en curso: si llega tarde, su respuesta se descarta. */
  private ultimaBusqueda = 0

  /** Columnas de la rejilla, para que las flechas se muevan en dos
   *  dimensiones como se ve y no como está en el array. */
  private columnas = 3

  constructor() {
    void this.arrancar()
  }

  private async arrancar(): Promise<void> {
    const sucursalId = this.sesion.sucursal()?.id ?? ''
    const [categorias, facetas] = await Promise.all([
      this.catalogo.categorias(sucursalId),
      this.catalogo.facetas(sucursalId),
    ])
    this.categorias.set(categorias)
    // La categoría ya tiene su fila de pastillas: repetirla como faceta
    // sería dos mandos para lo mismo.
    this.facetas.set(facetas.filter((faceta) => faceta.clave !== 'categoria'))
    await this.buscar('')
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
      filtros: this.filtros(),
      orden: this.orden(),
      limite: 24,
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

  protected filtrar(codigo: string | null): void {
    this.categoria.set(codigo)
    void this.buscar(this.texto())
  }

  /** Un segundo toque en la misma opción la quita: es un filtro, no un radio. */
  protected alternar(clave: string, valor: string): void {
    this.filtros.update((actuales) => {
      const siguiente = { ...actuales }
      if (siguiente[clave] === valor) delete siguiente[clave]
      else siguiente[clave] = valor
      return siguiente
    })
    void this.buscar(this.texto())
  }

  protected ordenarPor(valor: OrdenCatalogo): void {
    this.orden.set(valor)
    void this.buscar(this.texto())
  }

  protected limpiarFiltros(): void {
    this.filtros.set({})
    void this.buscar(this.texto())
  }

  protected verFicha(producto: ProductoRef): void {
    this.ficha.set(producto)
  }

  protected agregarDesdeFicha(producto: ProductoRef, elegido: Agregado): void {
    this.agregar(producto, elegido.presentacion, elegido.cantidad)
    this.ficha.set(null)
    this.enfocar()
  }

  protected agregar(producto: ProductoRef, pres: PresentacionVenta, cantidad = 1): void {
    this.ticket.agregarLinea({
      productoId: producto.id,
      descripcion: producto.descripcion,
      unidad: pres.unidad,
      factorAlmacen: pres.factorAlmacen,
      cantidad,
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
   * ido a un botón tras un clic, y el cajero sigue escribiendo igual.
   */
  protected atajo(evento: KeyboardEvent): void {
    if (this.ficha()) {
      if (evento.key === 'Escape') this.ficha.set(null)
      return
    }

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
      case 'ArrowRight':
        evento.preventDefault()
        this.moverProducto(1)
        break
      case 'ArrowLeft':
        evento.preventDefault()
        this.moverProducto(-1)
        break
      case 'ArrowDown':
        evento.preventDefault()
        this.moverProducto(this.anchoRejilla())
        break
      case 'ArrowUp':
        evento.preventDefault()
        this.moverProducto(-this.anchoRejilla())
        break
      case 'Enter': {
        const producto = this.activo()
        const pres = producto?.presentaciones[this.presentacion()]
        if (!producto || !pres) return
        evento.preventDefault()
        this.agregar(producto, pres)
        break
      }
      case ' ': {
        if (this.enCampo(evento) && this.texto().length > 0) return
        const producto = this.activo()
        if (!producto) return
        evento.preventDefault()
        this.verFicha(producto)
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

  /** Cuántas tarjetas caben por fila ahora mismo, leído del propio DOM: la
   *  rejilla es `auto-fill`, así que el número depende del ancho real. */
  private anchoRejilla(): number {
    const rejilla = document.querySelector('.pv-rejilla')
    if (rejilla) {
      const columnas = getComputedStyle(rejilla).gridTemplateColumns.split(' ').length
      if (columnas > 0) this.columnas = columnas
    }
    return this.columnas
  }

  private moverProducto(paso: number): void {
    const total = this.resultados().length
    this.fila.update((actual) => {
      const siguiente = actual + paso
      // Arriba y abajo no dan la vuelta: en una rejilla eso desorienta. Se
      // quedan en el borde, que es lo que hace cualquier tabla.
      if (Math.abs(paso) > 1) return siguiente < 0 || siguiente >= total ? actual : siguiente
      return (siguiente + total) % total
    })
    this.presentacion.set(0)
    this.desplazarAVista()
  }

  private desplazarAVista(): void {
    queueMicrotask(() => {
      document
        .querySelector('.pv-tarjeta-activa')
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
