import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core'
import {
  alternarFiltro,
  cuantosFiltros,
  filtroPuesto,
  filtrosActivos,
  quitarFaceta,
  type Faceta,
  type FiltrosCatalogo,
} from '@pos-core/index'

/**
 * Los filtros del catálogo. Una sola pieza para todos los rubros.
 *
 * Está en el kit y no en la pantalla de venta porque las dos pantallas los
 * necesitan y antes solo una los tenía: la de ropa se quedó con un campo de
 * texto, y en una tienda de ropa la pregunta es justo la que un filtro
 * contesta —«¿hay en M?»—. Duplicarlos habría dejado dos barras que
 * divergen al segundo arreglo.
 *
 * No sabe de rubros: pinta las facetas que recibe, con sus cuentas. Quien
 * decide que existe «laboratorio» o «talla» es el catálogo.
 *
 * DOS PARTES, y la de arriba es la que faltaba:
 *
 *   Lo puesto    pastillas, siempre visibles, cada una se quita de un toque
 *   El panel     las facetas enteras, plegable donde estorba
 *
 * Sin la primera, el cajero ponía tres filtros, cerraba el panel, veía
 * cuatro productos y no sabía por qué. Acababa diciéndole al cliente que no
 * hay stock.
 */
@Component({
  selector: 'km-filtros',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (activos().length > 0) {
      <div class="pv-activos pv-entra">
        @for (activo of activos(); track activo.clave + activo.valor) {
          <button
            class="pv-activo"
            type="button"
            [attr.aria-label]="'Quitar el filtro ' + activo.faceta + ' ' + activo.etiqueta"
            (click)="alternar(activo.clave, activo.valor)"
          >
            <span class="pv-activo-faceta">{{ activo.faceta }}</span>
            <span>{{ activo.etiqueta }}</span>
            <span class="pv-activo-x" aria-hidden="true">×</span>
          </button>
        }
        <button class="pv-activo-todo" type="button" (click)="limpiar()">Quitar todo</button>
      </div>
    }

    @if (abierto() || !plegable()) {
      <div class="pv-filtros" [class.pv-entra]="plegable()">
        @for (faceta of facetas(); track faceta.clave) {
          <div class="pv-filtro">
            <div class="mb-1.5 flex items-baseline justify-between gap-2">
              <p class="pv-etiqueta text-tenue">{{ faceta.etiqueta }}</p>
              @if (puestosEn(faceta.clave) > 0) {
                <button
                  class="pv-filtro-limpia"
                  type="button"
                  (click)="limpiarFaceta(faceta.clave)"
                >
                  quitar {{ puestosEn(faceta.clave) }}
                </button>
              }
            </div>
            <div class="flex flex-wrap gap-1" [class.pv-tramos]="faceta.forma === 'tramos'">
              @for (opcion of faceta.opciones; track opcion.valor) {
                <!--
                  Se puede elegir MÁS DE UNA: «Genfar o Portugal», «talla M y
                  L». Antes cada faceta era un radio disfrazado de filtro —el
                  segundo clic borraba el primero—, y eso es buena parte de
                  por qué parecían no funcionar.

                  Y la opción que dejaría la pantalla vacía va apagada, no
                  escondida: esconderla movería las pastillas de sitio a cada
                  clic y el ojo perdería la que iba a pulsar.
                -->
                <button
                  class="pv-filtro-opcion"
                  type="button"
                  [class.pv-filtro-marcada]="puesto(faceta.clave, opcion.valor)"
                  [disabled]="opcion.cuantos === 0 && !puesto(faceta.clave, opcion.valor)"
                  [attr.aria-pressed]="puesto(faceta.clave, opcion.valor)"
                  (click)="alternar(faceta.clave, opcion.valor)"
                >
                  {{ opcion.etiqueta }}
                  <span class="pv-filtro-cuenta">{{ opcion.cuantos }}</span>
                </button>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class FiltrosComponent {
  readonly facetas = input<readonly Faceta[]>([])

  /** Lo puesto. Es `model` para que la pantalla no tenga que reenviarlo. */
  readonly filtros = model<FiltrosCatalogo>({})

  /**
   * Si el panel se pliega.
   *
   * En la pantalla genérica sí: el 90 % de las ventas es escanear y una
   * barra permanente robaría dos filas de catálogo. En ropa no, porque la
   * talla y el color SON la venta y esconderlos sería esconder la pantalla.
   */
  readonly plegable = input(true)
  readonly abierto = model(false)

  /** Se avisa de cada cambio: quien manda vuelve a buscar. */
  readonly cambio = output<FiltrosCatalogo>()

  readonly cuantos = computed(() => cuantosFiltros(this.filtros()))
  protected readonly activos = computed(() => filtrosActivos(this.filtros(), this.facetas()))

  protected puesto(clave: string, valor: string): boolean {
    return filtroPuesto(this.filtros(), clave, valor)
  }

  protected puestosEn(clave: string): number {
    return this.filtros()[clave]?.length ?? 0
  }

  protected alternar(clave: string, valor: string): void {
    this.aplicar(alternarFiltro(this.filtros(), clave, valor))
  }

  protected limpiarFaceta(clave: string): void {
    this.aplicar(quitarFaceta(this.filtros(), clave))
  }

  protected limpiar(): void {
    this.aplicar({})
  }

  private aplicar(siguientes: FiltrosCatalogo): void {
    this.filtros.set(siguientes)
    this.cambio.emit(siguientes)
  }
}
