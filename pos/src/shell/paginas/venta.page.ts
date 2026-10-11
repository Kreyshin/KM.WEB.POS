import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { PresentacionVenta, ProductoRef } from '@pos-core/index'
import { MonedaPipe, PUERTO_CATALOGO, TicketService } from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'

/**
 * Zona de venta.
 *
 * La mitad izquierda del mostrador: buscar y elegir. La derecha —ticket,
 * totales y cobro— la pone el shell y es igual para todos los rubros.
 *
 * El buscador vive aquí, y no dentro del perfil, porque el gesto es el mismo
 * en ropa y en farmacia: escanear o escribir. Lo que cambia por rubro es qué
 * se busca y cómo se presentan los resultados, y eso lo aportará el perfil en
 * el hito 3 a través de `BuscadorProductos` y `pantallaVenta`. Hasta
 * entonces, esta lista genérica es suficiente para probar el núcleo.
 */
@Component({
  selector: 'km-venta-page',
  imports: [FormsModule, MonedaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'atajo($event)' },
  template: `
    <div class="pv-fade-in flex h-full flex-col gap-4">
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            #buscador
            class="pv-campo pr-16"
            type="search"
            placeholder="Escanea un código o escribe para buscar…"
            aria-label="Buscar producto"
            autocomplete="off"
            [ngModel]="texto()"
            (ngModelChange)="buscar($event)"
          />
          <span
            class="pv-tecla absolute right-3 top-1/2 -translate-y-1/2 text-tenue"
            aria-hidden="true"
          >
            F2
          </span>
        </div>
        <button class="pv-boton pv-boton-tenue" type="button" disabled>
          Cliente
          <span class="pv-tecla">F6</span>
        </button>
      </div>

      <div class="pv-panel min-h-0 flex-1 overflow-auto">
        @if (buscando()) {
          <p class="text-tenue p-8 text-center text-sm">Buscando…</p>
        } @else if (resultados().length === 0) {
          <div class="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p class="text-tenue text-sm">
              {{
                texto() ? 'Sin resultados para «' + texto() + '»' : 'Busca un producto para empezar'
              }}
            </p>
            <p class="text-tenue text-xs">Prueba con «paracetamol», «ibu» o un código de barras.</p>
          </div>
        } @else {
          <ul class="divide-y divide-linea">
            @for (producto of resultados(); track producto.id) {
              <li class="p-4">
                <div class="mb-2 flex items-baseline justify-between gap-3">
                  <p class="truncate font-semibold">{{ producto.descripcion }}</p>
                  <p class="pv-cifra text-tenue shrink-0 text-xs">{{ producto.codigoBarras }}</p>
                </div>

                <!-- Una presentación, un botón. Elegir la unidad ES elegir el
                     precio, así que no se separan en dos pasos. -->
                <div class="flex flex-wrap gap-2">
                  @for (presentacion of producto.presentaciones; track presentacion.id) {
                    <button
                      class="pv-boton pv-boton-tenue flex-col items-start gap-0 px-3 py-2 text-xs"
                      type="button"
                      (click)="agregar(producto, presentacion)"
                    >
                      <span class="font-semibold">{{ presentacion.unidad.nombre }}</span>
                      <span class="pv-cifra text-tenue text-[11px] font-normal">
                        {{ presentacion.precio | moneda }}
                        @if (presentacion.igvTasa === 0) {
                          · exonerado
                        }
                      </span>
                    </button>
                  }
                </div>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class VentaPage {
  private readonly catalogo = inject(PUERTO_CATALOGO)
  private readonly sesion = inject(SesionStore)
  private readonly ticket = inject(TicketService)

  protected readonly texto = signal('')
  protected readonly resultados = signal<ProductoRef[]>([])
  protected readonly buscando = signal(false)

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
    const hallados = await this.catalogo.buscar({ texto, sucursalId, limite: 8 })

    // Escribir rápido lanza varias búsquedas y no llegan en orden: sin esto,
    // una respuesta lenta de «para» pisaría la de «paracetamol».
    if (mia !== this.ultimaBusqueda) return

    this.resultados.set(hallados)
    this.buscando.set(false)
  }

  protected agregar(producto: ProductoRef, presentacion: PresentacionVenta): void {
    this.ticket.agregarLinea({
      productoId: producto.id,
      descripcion: producto.descripcion,
      unidad: presentacion.unidad,
      factorAlmacen: presentacion.factorAlmacen,
      cantidad: 1,
      precioUnitario: presentacion.precio,
      igvTasa: presentacion.igvTasa,
      atributos: {},
    })
  }

  protected atajo(evento: KeyboardEvent): void {
    if (evento.key !== 'F2') return
    evento.preventDefault()
    document.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
  }
}
