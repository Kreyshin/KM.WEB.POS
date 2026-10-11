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
import { consumoAlmacen, type DatoLinea, type LineaTicket } from '@pos-core/index'
import { TicketService } from '../estado/ticket.service'
import { MonedaPipe } from './moneda.pipe'
import { IconoProductoComponent } from './icono-producto.component'

/**
 * El carrito: las líneas del ticket en curso.
 *
 * Es igual para todos los rubros y por eso vive aquí y no en un perfil. Lo
 * que cambia por rubro es qué datos lleva una línea —el lote, la serie, la
 * talla—, y eso lo aporta `PerfilRubro.detalleDeLinea`.
 *
 * DOS NIVELES, y es la diferencia con lo que había.
 *
 * Arriba, lo que se mira sin tocar nada: nombre, los datos del rubro como
 * etiquetas, la cantidad y el importe. Antes el nombre era la frase entera
 * que compone el perfil —«Amoxicilina 500 mg · Blíster x10 · lote LT-5540 ·
 * receta RX-7788»— recortada a la mitad por el ancho de la columna, y lo
 * que se perdía era justo el lote, que es lo que el cajero contrasta contra
 * la caja que tiene en la mano.
 *
 * Debajo, plegado, lo que se usa cuando algo hay que corregir: el precio
 * unitario, el descuento y los datos del rubro. Plegado porque la venta
 * normal no lo necesita y una columna con seis mandos por línea no se lee.
 *
 * LA CANTIDAD SE TECLEA. Los botones siguen, porque de uno en uno es como
 * se cambia el 90 % de las veces, pero vender doce cajas eran doce clics y
 * eso es la cola parada mirando a un cajero pulsar un «+».
 */
@Component({
  selector: 'km-carrito',
  imports: [FormsModule, MonedaPipe, IconoProductoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="flex flex-col">
      @for (linea of ticket.lineas(); track linea.id) {
        <li
          class="pv-ticket-linea pv-fade-in px-4 py-2.5"
          [class.pv-ticket-linea-abierta]="abierta() === linea.id"
        >
          <div class="flex items-start gap-2.5">
            <km-icono-producto [clave]="linea.icono" [tamano]="30" />

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm leading-snug font-semibold">{{ linea.descripcion }}</p>

              <!-- Los datos del rubro, enteros y en su sitio. El lote no se
                   recorta porque no comparte línea con el nombre. -->
              @if (detalle()(linea); as datos) {
                @if (datos.length > 0) {
                  <p class="mt-1 flex flex-wrap gap-1">
                    @for (dato of datos; track dato.etiqueta) {
                      <span
                        class="pv-dato-linea"
                        [attr.data-tono]="dato.tono ?? 'neutro'"
                        [title]="dato.etiqueta"
                      >
                        <span class="pv-dato-clave">{{ dato.etiqueta }}</span>
                        {{ dato.valor }}
                      </span>
                    }
                  </p>
                }
              }

              <p class="mt-0.5 text-xs opacity-55">
                {{ linea.unidad.nombre }}
                <!-- El consumo de almacén solo cuando difiere de lo vendido:
                     en una tableta suelta sobra, en una caja de 100 es justo
                     lo que hay que comprobar. -->
                @if (linea.factorAlmacen !== 1) {
                  · {{ consumo(linea) }} en almacén
                }
                @if (linea.igvTasa === 0) {
                  · <span class="font-semibold">exonerado</span>
                }
              </p>
            </div>

            <div class="shrink-0 text-right">
              <p class="pv-cifra text-sm font-semibold">{{ importe(linea) | moneda: false }}</p>
              @if (linea.descuento > 0) {
                <p class="pv-cifra text-[11px] font-semibold text-[var(--pv-exito)]">
                  −{{ linea.descuento | moneda: false }}
                </p>
              }
            </div>
          </div>

          <div class="mt-1.5 flex items-center gap-1.5 pl-[2.625rem]">
            <button
              class="pv-paso"
              type="button"
              [disabled]="!ticket.editable()"
              [attr.aria-label]="'Quitar una unidad de ' + linea.descripcion"
              (click)="ticket.cambiarCantidad(linea.id, linea.cantidad - 1)"
            >
              −
            </button>

            <!-- Tecleable: doce cajas eran doce clics. Se escribe encima y
                 Entrar o salir del campo lo aplica; vacío no borra la línea,
                 porque borrar un dato no es lo mismo que pedir quitarla. -->
            <input
              class="pv-cantidad pv-cifra"
              type="text"
              inputmode="numeric"
              [disabled]="!ticket.editable()"
              [attr.aria-label]="'Cantidad de ' + linea.descripcion"
              [value]="linea.cantidad"
              (focus)="$any($event.target).select()"
              (keydown.enter)="$any($event.target).blur()"
              (blur)="escribirCantidad(linea, $any($event.target).value)"
            />

            <button
              class="pv-paso"
              type="button"
              [disabled]="!ticket.editable()"
              [attr.aria-label]="'Agregar una unidad de ' + linea.descripcion"
              (click)="ticket.cambiarCantidad(linea.id, linea.cantidad + 1)"
            >
              +
            </button>

            <span class="pv-cifra ml-auto text-[11px] opacity-50">
              {{ linea.precioUnitario | moneda: false }} c/{{ linea.unidad.abreviatura }}
            </span>

            <button
              class="pv-paso pv-paso-mas"
              type="button"
              [attr.aria-expanded]="abierta() === linea.id"
              [attr.aria-label]="'Ajustes de ' + linea.descripcion"
              (click)="alternar(linea.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" width="15" height="15" aria-hidden="true">
                <path
                  d="M6 9.5 12 15l6-5.5"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>

          @if (abierta() === linea.id) {
            <div class="pv-linea-ajustes pv-entra">
              <!-- El descuento se escribe en SOLES, y los porcentajes son
                   atajos. En el mostrador se regatea en soles —«déjalo en
                   veinte»— y obligar a calcular el porcentaje de cabeza con
                   el cliente delante es cómo se regalan importes. -->
              <div class="pv-ajuste">
                <label [attr.for]="'desc-' + linea.id">Descuento</label>
                <div class="flex items-center gap-1">
                  <input
                    class="pv-campo pv-cifra pv-ajuste-campo"
                    type="text"
                    inputmode="decimal"
                    placeholder="0.00"
                    [id]="'desc-' + linea.id"
                    [disabled]="!ticket.editable()"
                    [value]="linea.descuento || ''"
                    (keydown.enter)="$any($event.target).blur()"
                    (blur)="descontar(linea, $any($event.target).value)"
                  />
                  @for (parte of porcentajes; track parte) {
                    <button
                      class="pv-filtro-opcion"
                      type="button"
                      [disabled]="!ticket.editable()"
                      (click)="descontarPorcentaje(linea, parte)"
                    >
                      {{ parte }}%
                    </button>
                  }
                  @if (linea.descuento > 0) {
                    <button class="pv-filtro-opcion" type="button" (click)="descontar(linea, '0')">
                      sin
                    </button>
                  }
                </div>
              </div>

              <div class="flex items-center gap-2 pt-0.5">
                @if (editable()) {
                  <!-- Cambiar el lote sin tirar la línea. Quitarla y volverla
                       a meter perdía el descuento y la mandaba al final del
                       ticket, donde el cajero ya no la está mirando. -->
                  <button
                    class="pv-boton pv-boton-tenue flex-1 justify-center text-xs"
                    type="button"
                    [disabled]="!ticket.editable()"
                    (click)="editar.emit(linea)"
                  >
                    Cambiar datos
                  </button>
                }
                <!-- Tenue, no rojo en bloque: quitar una línea se deshace
                     volviéndola a escanear, y un botón que grita más que
                     «Cobrar» enseña a no mirar los avisos. -->
                <button
                  class="pv-boton pv-boton-tenue pv-quitar-linea flex-1 justify-center text-xs"
                  type="button"
                  [disabled]="!ticket.editable()"
                  (click)="ticket.quitarLinea(linea.id)"
                >
                  Quitar
                </button>
              </div>
            </div>
          }
        </li>
      }
    </ul>
  `,
})
export class CarritoComponent {
  protected readonly ticket = inject(TicketService)

  /**
   * Los datos del rubro de una línea. Lo pone el PERFIL.
   *
   * Llega como `input` y no inyectando el perfil porque esta capa no puede
   * conocer el registro, que vive en el shell. Sin perfil no hay datos, que
   * es lo correcto: un POS sin rubro configurado vende igual.
   */
  readonly detalle = input<(linea: LineaTicket) => readonly DatoLinea[]>(() => [])

  /** Si el rubro sabe reabrir los datos de una línea ya metida. */
  readonly editable = input(false)

  /** Pide al shell que reabra los campos del rubro para esta línea. */
  readonly editar = output<LineaTicket>()

  protected readonly porcentajes = [5, 10, 20]

  /** Solo una abierta: dos paneles abiertos dejan el total fuera de pantalla. */
  protected readonly abierta = signal<string | null>(null)

  protected readonly cuantas = computed(() => this.ticket.lineas().length)

  protected alternar(lineaId: string): void {
    this.abierta.update((actual) => (actual === lineaId ? null : lineaId))
  }

  protected consumo(linea: LineaTicket): number {
    return consumoAlmacen(linea)
  }

  protected importe(linea: LineaTicket): number {
    return Math.max(0, linea.cantidad * linea.precioUnitario - linea.descuento)
  }

  /**
   * Lo tecleado en el campo de cantidad.
   *
   * Un campo vacío o que no es un número deja la línea como estaba: borrar
   * el contenido mientras se escribe no es pedir que se quite la línea, y
   * tragárselo así tiraría la línea al salir del campo.
   */
  protected escribirCantidad(linea: LineaTicket, texto: string): void {
    const cantidad = Number(texto.replace(',', '.'))
    if (!Number.isFinite(cantidad) || texto.trim() === '') {
      // Se repinta para que el campo vuelva a enseñar la cantidad real.
      this.ticket.cambiarCantidad(linea.id, linea.cantidad)
      return
    }
    this.ticket.cambiarCantidad(linea.id, Math.floor(cantidad))
  }

  protected descontar(linea: LineaTicket, texto: string): void {
    const importe = Number(texto.replace(',', '.'))
    if (!Number.isFinite(importe)) return
    // Topado al importe de la línea: un descuento mayor que lo que cuesta
    // sería pagarle al cliente por llevárselo.
    const bruto = linea.cantidad * linea.precioUnitario
    this.ticket.aplicarDescuento(Math.min(Math.max(0, importe), bruto), linea.id)
  }

  protected descontarPorcentaje(linea: LineaTicket, parte: number): void {
    const bruto = linea.cantidad * linea.precioUnitario
    this.ticket.aplicarDescuento(Math.round(bruto * parte) / 100, linea.id)
  }
}
