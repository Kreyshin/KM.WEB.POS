import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import type { ProductoRef, VarianteProducto } from '@pos-core/index'
import { varianteDe } from '@pos-core/index'

/** Lo que la matriz devuelve cuando se elige una celda con stock. */
export interface EleccionVariante {
  variante: VarianteProducto
  atributos: Readonly<Record<string, string>>
}

/**
 * Matriz de variantes.
 *
 * Es la razón de que `pantallaVenta` exista en el contrato del perfil. En
 * una botica se busca un producto y se agrega; aquí la pregunta del
 * cliente ya trae la respuesta a medias —«esta camisa en M»— y lo que
 * falta no es encontrar el producto, es saber SI HAY.
 *
 * Por eso es una rejilla y no dos desplegables: con la matriz delante, el
 * vendedor contesta «en M solo queda blanca» sin tocar nada. Con dos
 * desplegables tendría que probar combinación por combinación, que es lo
 * que hace que se termine mirando el estante en vez de la pantalla.
 *
 * Tres estados por celda, y los tres importan:
 *   HAY        se puede vender, con las existencias a la vista
 *   AGOTADA    la tienda la trabaja pero está en cero: se repone
 *   NO EXISTE  no se trabaja esa combinación: no se repone nunca
 *
 * Fundir las dos últimas en «no disponible» sería perder la respuesta que
 * el cliente quiere: si vuelvo mañana, ¿la habrá?
 */
@Component({
  selector: 'km-matriz-variantes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (ejes().length === 2) {
      <table class="pv-matriz">
        <thead>
          <tr>
            <th class="pv-matriz-esquina">
              <span class="pv-etiqueta text-tenue">{{ ejes()[1].etiqueta }}</span>
            </th>
            @for (columna of ejes()[0].valores; track columna) {
              <th>{{ columna }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (fila of ejes()[1].valores; track fila) {
            <tr>
              <th class="pv-matriz-fila">{{ fila }}</th>
              @for (columna of ejes()[0].valores; track columna) {
                <td>
                  @if (celda(columna, fila); as variante) {
                    <button
                      class="pv-celda"
                      type="button"
                      [class.pv-celda-agotada]="(variante.stock ?? 0) === 0"
                      [class.pv-celda-poca]="
                        (variante.stock ?? 0) > 0 && (variante.stock ?? 0) <= 2
                      "
                      [disabled]="(variante.stock ?? 0) === 0"
                      [attr.aria-label]="
                        ejes()[0].etiqueta +
                        ' ' +
                        columna +
                        ', ' +
                        ejes()[1].etiqueta +
                        ' ' +
                        fila +
                        ': ' +
                        ((variante.stock ?? 0) === 0 ? 'agotada' : variante.stock + ' disponibles')
                      "
                      (click)="elegir(columna, fila)"
                    >
                      {{ (variante.stock ?? 0) === 0 ? '—' : variante.stock }}
                    </button>
                  } @else {
                    <span class="pv-celda-vacia" title="No se trabaja esta combinación">·</span>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>

      <p class="pv-matriz-leyenda">
        <span><span class="pv-punto-hay"></span> cantidad disponible</span>
        <span><span class="pv-punto-agotada"></span> agotada, se repone</span>
        <span><span class="pv-punto-nunca"></span> no se trabaja</span>
      </p>
    } @else if (ejes().length === 1) {
      <!-- Un solo eje: una fila de botones, no una tabla de una columna. -->
      <div class="flex flex-wrap gap-1.5">
        @for (valor of ejes()[0].valores; track valor) {
          @if (celdaUnica(valor); as variante) {
            <button
              class="pv-celda pv-celda-ancha"
              type="button"
              [class.pv-celda-agotada]="(variante.stock ?? 0) === 0"
              [disabled]="(variante.stock ?? 0) === 0"
              (click)="elegirUnico(valor)"
            >
              <span class="font-semibold">{{ valor }}</span>
              <span class="text-[11px] opacity-70">
                {{ (variante.stock ?? 0) === 0 ? 'agotada' : variante.stock }}
              </span>
            </button>
          }
        }
      </div>
    }
  `,
})
export class MatrizVariantesComponent {
  readonly producto = input.required<ProductoRef>()
  readonly elegida = output<EleccionVariante>()

  protected readonly ejes = computed(() => this.producto().ejes ?? [])

  protected celda(columna: string, fila: string): VarianteProducto | null {
    const [ejeColumna, ejeFila] = this.ejes()
    return varianteDe(this.producto(), {
      [ejeColumna.clave]: columna,
      [ejeFila.clave]: fila,
    })
  }

  protected celdaUnica(valor: string): VarianteProducto | null {
    return varianteDe(this.producto(), { [this.ejes()[0].clave]: valor })
  }

  protected elegir(columna: string, fila: string): void {
    const variante = this.celda(columna, fila)
    if (!variante || (variante.stock ?? 0) === 0) return
    this.elegida.emit({ variante, atributos: variante.atributos })
  }

  protected elegirUnico(valor: string): void {
    const variante = this.celdaUnica(valor)
    if (!variante || (variante.stock ?? 0) === 0) return
    this.elegida.emit({ variante, atributos: variante.atributos })
  }
}
