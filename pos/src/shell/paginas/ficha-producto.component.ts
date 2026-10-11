import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'
import type { PresentacionVenta, ProductoRef } from '@pos-core/index'
import { IconoProductoComponent, MonedaPipe } from '@pos-core-ui/index'

/** Lo que el panel devuelve al cerrarse con una venta decidida. */
export interface Agregado {
  presentacion: PresentacionVenta
  cantidad: number
}

/**
 * Ficha del producto.
 *
 * Existe por dos preguntas que se hacen en el mostrador todos los días y que
 * la lista no sabía contestar:
 *
 *   «¿De qué es esto?» → los campos de la ficha, que el catálogo compone y
 *   aquí solo se pintan. El cajero responde sin salir de la venta ni buscar
 *   la caja en el estante.
 *
 *   «¿Me da una sola?» → el bloque de presentaciones. Las fraccionadas se
 *   marcan y se explica en unidades de almacén qué consume cada una, porque
 *   vender un blíster y partirlo no es lo mismo para el inventario y el
 *   cajero tiene que verlo antes de decidir.
 *
 * No sabe de farmacia: recibe pares etiqueta/valor y presentaciones. El
 * mismo panel sirve para la composición de una prenda.
 */
@Component({
  selector: 'km-ficha-producto',
  imports: [MonedaPipe, IconoProductoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div class="pv-velo" role="dialog" aria-modal="true" [attr.aria-label]="producto().descripcion">
      <button
        class="pv-velo-cierre"
        type="button"
        aria-label="Cerrar"
        (click)="cerrar.emit()"
      ></button>

      <div class="pv-panel pv-entra pv-ficha-panel relative">
        <header class="flex items-start gap-3 border-b border-linea p-5">
          <km-icono-producto [clave]="producto().icono" [tamano]="46" />
          <div class="min-w-0 flex-1">
            <h2 class="text-base leading-tight font-semibold">{{ producto().descripcion }}</h2>
            <p class="pv-cifra text-tenue mt-0.5 text-xs">{{ producto().codigoBarras }}</p>
            <div class="mt-2 flex flex-wrap gap-1.5">
              @for (campo of destacados(); track campo.etiqueta) {
                <span class="pv-marca-ficha">{{ campo.valor }}</span>
              }
              @if (exigeReceta()) {
                <span class="pv-receta">receta</span>
              }
            </div>
          </div>
          <button class="text-tenue shrink-0 text-sm" type="button" (click)="cerrar.emit()">
            Cerrar
          </button>
        </header>

        <div class="pv-ficha-cuerpo">
          <!-- Datos. Es la respuesta a «¿de qué es?». -->
          <section>
            <p class="pv-etiqueta text-tenue mb-2">Datos del producto</p>
            <dl class="pv-ficha-datos">
              @for (campo of resto(); track campo.etiqueta) {
                <div>
                  <dt>{{ campo.etiqueta }}</dt>
                  <dd>{{ campo.valor }}</dd>
                </div>
              }
            </dl>
            @if (!producto().ficha) {
              <p class="text-tenue text-xs">El catálogo no trae ficha para este producto.</p>
            }
          </section>

          <!-- Presentaciones. Es la respuesta a «¿me da una sola?». -->
          <section>
            <div class="mb-2 flex items-baseline justify-between">
              <p class="pv-etiqueta text-tenue">Cómo venderlo</p>
              @if (stock() !== undefined) {
                <p class="text-xs" [class.text-error]="stock() === 0">
                  {{ stock() }} {{ producto().unidadAlmacen.abreviatura }} en stock
                </p>
              }
            </div>

            <div class="flex flex-col gap-1.5">
              @for (pres of producto().presentaciones; track pres.id) {
                <button
                  class="pv-opcion-venta"
                  type="button"
                  [class.pv-opcion-activa]="pres.id === elegida().id"
                  (click)="elegir(pres)"
                >
                  <span class="min-w-0">
                    <span class="flex items-center gap-1.5">
                      <span class="truncate text-sm font-semibold">{{ pres.unidad.nombre }}</span>
                      @if (pres.fraccionada) {
                        <span class="pv-marca-fraccion">suelta</span>
                      }
                      @if (pres.igvTasa === 0) {
                        <span class="pv-exonerado">exon</span>
                      }
                    </span>
                    <span class="text-tenue block text-xs">{{ equivalencia(pres) }}</span>
                  </span>
                  <span class="pv-cifra shrink-0 text-right text-sm font-semibold">
                    {{ pres.precio | moneda }}
                  </span>
                </button>
              }
            </div>

            @if (elegida().fraccionada) {
              <p class="pv-aviso-fraccion">
                Se vende partiendo el envase: descuenta
                {{ elegida().factorAlmacen }} {{ producto().unidadAlmacen.abreviatura }} del stock
                por unidad y el resto del envase queda abierto.
              </p>
            }
          </section>
        </div>

        <footer class="flex items-center gap-3 border-t border-linea p-4">
          <div class="pv-contador">
            <button type="button" aria-label="Quitar una" (click)="paso(-1)">−</button>
            <span class="pv-cifra">{{ cantidad() }}</span>
            <button type="button" aria-label="Añadir una" (click)="paso(1)">+</button>
          </div>

          <button
            class="pv-boton pv-boton-accion flex-1 justify-between"
            type="button"
            (click)="confirmar()"
          >
            <span>Agregar al ticket</span>
            <span class="pv-cifra">{{ importe() | moneda }}</span>
          </button>
        </footer>
      </div>
    </div>
  `,
})
export class FichaProductoComponent {
  readonly producto = input.required<ProductoRef>()

  readonly cerrar = output<void>()
  readonly agregar = output<Agregado>()

  /** Nula hasta que el cajero toca una: entonces vale la que ofrece el
   *  catálogo por defecto, que es la primera. */
  private readonly elegidaId = signal<string | null>(null)
  protected readonly cantidad = signal(1)

  protected readonly elegida = computed<PresentacionVenta>(() => {
    const todas = this.producto().presentaciones
    return todas.find((pres) => pres.id === this.elegidaId()) ?? todas[0]
  })

  protected readonly destacados = computed(
    () => this.producto().ficha?.filter((campo) => campo.destacado) ?? [],
  )
  protected readonly resto = computed(
    () => this.producto().ficha?.filter((campo) => !campo.destacado) ?? [],
  )
  protected readonly stock = computed(() => this.producto().stock)
  protected readonly exigeReceta = computed(() =>
    this.producto().ficha?.some((campo) => campo.valor === 'Con receta'),
  )
  protected readonly importe = computed(() => this.elegida().precio * this.cantidad())

  protected elegir(pres: PresentacionVenta): void {
    this.elegidaId.set(pres.id)
    this.cantidad.set(1)
  }

  protected paso(delta: number): void {
    this.cantidad.update((n) => Math.max(1, n + delta))
  }

  protected confirmar(): void {
    this.agregar.emit({ presentacion: this.elegida(), cantidad: this.cantidad() })
  }

  /** «1 blíster = 10 tabletas». Lo que el cajero necesita para decidir. */
  protected equivalencia(pres: PresentacionVenta): string {
    const almacen = this.producto().unidadAlmacen
    if (pres.unidad.codigo === almacen.codigo && pres.factorAlmacen === 1) {
      return `1 ${pres.unidad.abreviatura} de stock`
    }
    return `1 ${pres.unidad.abreviatura} = ${pres.factorAlmacen} ${almacen.abreviatura}`
  }
}
