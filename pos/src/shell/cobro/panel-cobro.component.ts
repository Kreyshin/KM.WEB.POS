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
  cobroCompleto,
  pendiente,
  recibido,
  vuelto,
  type Cobro,
  type MedioPago,
  type Pago,
  type Totales,
} from '@pos-core/index'
import { MonedaPipe, PUERTO_MEDIOS_PAGO } from '@pos-core-ui/index'
import { IconoMedioComponent } from './icono-medio.component'

/**
 * Panel de cobro.
 *
 * Es el momento más caro de la venta: hay cola, el cliente tiene el billete
 * en la mano y cualquier duda se paga en segundos. De ahí cada decisión:
 *
 *   - Los billetes sugeridos van primero. «Paga con 50» resuelve la mayoría
 *     de los cobros en efectivo de un toque, sin teclear nada.
 *   - El vuelto es lo más grande de la pantalla cuando lo hay. Es el único
 *     número que el cajero tiene que leer y decir en voz alta.
 *   - El pago mixto no es un modo aparte: se añaden medios y ya está. «20
 *     en efectivo y el resto con Yape» pasa a diario.
 *   - Confirmar no se habilita hasta que la cuenta cuadra. Un cobro a
 *     medias es una pérdida que no se descubre hasta el arqueo.
 *
 * Es el sustituto de KARMA.LIB.CAJA. Habla por puertos, así que el día que
 * la librería exista se cambia el proveedor y no la pantalla.
 */
@Component({
  selector: 'km-panel-cobro',
  imports: [FormsModule, MonedaPipe, IconoMedioComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents', '(document:keydown)': 'atajo($event)' },
  template: `
    <div class="pv-velo" role="dialog" aria-modal="true" aria-label="Cobrar">
      <button
        class="pv-velo-cierre"
        type="button"
        aria-label="Cancelar el cobro"
        (click)="cancelar.emit()"
      ></button>

      <div class="pv-operacion pv-panel pv-entra pv-cobro relative">
        <header class="pv-cobro-cabecera">
          <div>
            <p class="pv-etiqueta opacity-70">Total a cobrar</p>
            <p class="pv-cobro-total">{{ totales().total | moneda }}</p>
          </div>
          <button class="pv-cobro-cerrar" type="button" (click)="cancelar.emit()">Cancelar</button>
        </header>

        <div class="pv-cobro-cuerpo">
          <section>
            <p class="pv-etiqueta text-tenue mb-2">Con qué paga</p>
            <div class="pv-medios">
              @for (medio of medios(); track medio.codigo) {
                <button
                  class="pv-medio"
                  type="button"
                  [class.pv-medio-activo]="medio.codigo === medioActivo()?.codigo"
                  (click)="elegirMedio(medio)"
                >
                  <km-icono-medio [clave]="medio.icono" />
                  <span>{{ medio.nombre }}</span>
                </button>
              }
            </div>
          </section>

          @if (medioActivo(); as medio) {
            <section>
              <div class="mb-2 flex items-baseline justify-between">
                <p class="pv-etiqueta text-tenue">Cuánto entra por {{ medio.nombre }}</p>
                <p class="text-tenue text-xs">Falta {{ falta() | moneda }}</p>
              </div>

              <div class="flex gap-2">
                <input
                  class="pv-campo pv-cifra flex-1 text-right text-lg font-semibold"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.10"
                  [attr.aria-label]="'Importe en ' + medio.nombre"
                  [(ngModel)]="importe"
                />
                <button
                  class="pv-boton pv-boton-accion"
                  type="button"
                  [disabled]="!importeValido()"
                  (click)="anadir()"
                >
                  Añadir
                </button>
              </div>

              <!-- Billetes de verdad: el efectivo se paga con lo que hay en
                   la mano, no con el importe exacto. -->
              @if (medio.daVuelto) {
                <div class="pv-sugeridos">
                  @for (sugerido of sugeridos(); track sugerido) {
                    <button class="pv-sugerido" type="button" (click)="pagarCon(sugerido)">
                      {{ sugerido | moneda: false }}
                    </button>
                  }
                  <button class="pv-sugerido" type="button" (click)="pagarCon(falta())">
                    Justo
                  </button>
                </div>
              }

              @if (medio.pideReferencia) {
                <input
                  class="pv-campo mt-2 text-sm"
                  type="text"
                  placeholder="N.º de operación (opcional)"
                  aria-label="Número de operación"
                  [(ngModel)]="referencia"
                />
              }
            </section>
          }

          @if (pagos().length > 0) {
            <section>
              <p class="pv-etiqueta text-tenue mb-2">Pagos aplicados</p>
              <ul class="flex flex-col gap-1">
                @for (pago of pagos(); track $index) {
                  <li class="pv-pago">
                    <km-icono-medio [clave]="pago.medio.icono" />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-semibold">
                        {{ pago.medio.nombre }}
                      </span>
                      @if (pago.referencia) {
                        <span class="pv-cifra text-tenue block truncate text-[11px]">
                          op. {{ pago.referencia }}
                        </span>
                      }
                    </span>
                    <span class="pv-cifra text-sm font-semibold">{{ pago.importe | moneda }}</span>
                    <button
                      class="pv-paso"
                      type="button"
                      [attr.aria-label]="'Quitar el pago con ' + pago.medio.nombre"
                      (click)="quitar($index)"
                    >
                      ×
                    </button>
                  </li>
                }
              </ul>
            </section>
          }

          <section>
            <p class="pv-etiqueta text-tenue mb-2">Comprobante</p>
            <div class="flex flex-wrap gap-1.5">
              @for (tipo of comprobantes; track tipo.codigo) {
                <button
                  class="pv-filtro-opcion"
                  type="button"
                  [class.pv-filtro-marcada]="tipo.codigo === comprobante()"
                  (click)="comprobante.set(tipo.codigo)"
                >
                  {{ tipo.nombre }}
                </button>
              }
            </div>
            @if (comprobante() !== 'NDV') {
              <input
                class="pv-campo mt-2 text-sm"
                type="text"
                [placeholder]="comprobante() === 'FAC' ? 'RUC del cliente' : 'DNI (opcional)'"
                [attr.aria-label]="comprobante() === 'FAC' ? 'RUC del cliente' : 'DNI del cliente'"
                [(ngModel)]="documento"
              />
              @if (comprobante() === 'FAC' && !rucValido()) {
                <p class="pv-error-campo">Una factura necesita un RUC de 11 dígitos.</p>
              }
            }
          </section>
        </div>

        <footer class="pv-cobro-pie">
          @if (cambio() > 0) {
            <div class="pv-vuelto">
              <p class="pv-etiqueta opacity-70">Vuelto</p>
              <p class="pv-vuelto-cifra">{{ cambio() | moneda }}</p>
            </div>
          } @else if (falta() > 0) {
            <div class="pv-falta">
              <p class="pv-etiqueta opacity-70">Falta por cubrir</p>
              <p class="pv-vuelto-cifra">{{ falta() | moneda }}</p>
            </div>
          }

          @if (error(); as mensaje) {
            <p class="pv-error-campo mb-2">{{ mensaje }}</p>
          }

          <button
            class="pv-boton pv-boton-accion pv-boton-grande w-full justify-center"
            type="button"
            [disabled]="!puedeCobrar() || enviando()"
            (click)="confirmar()"
          >
            {{ enviando() ? 'Registrando…' : 'Confirmar cobro' }}
          </button>
        </footer>
      </div>
    </div>
  `,
})
export class PanelCobroComponent {
  private readonly puerto = inject(PUERTO_MEDIOS_PAGO)

  readonly totales = input.required<Totales>()

  readonly cancelar = output<void>()
  readonly cobrado = output<Cobro>()

  protected readonly comprobantes = [
    { codigo: 'BOL', nombre: 'Boleta' },
    { codigo: 'FAC', nombre: 'Factura' },
    { codigo: 'NDV', nombre: 'Nota de venta' },
  ]

  protected readonly medios = signal<readonly MedioPago[]>([])
  protected readonly medioActivo = signal<MedioPago | null>(null)
  protected readonly pagos = signal<Pago[]>([])
  protected readonly comprobante = signal('BOL')
  protected readonly enviando = signal(false)
  protected readonly error = signal<string | null>(null)

  protected importe: number | null = null
  protected referencia = ''
  protected documento = ''

  protected readonly falta = computed(() => pendiente(this.totales().total, this.pagos()))
  protected readonly cambio = computed(() => vuelto(this.totales().total, this.pagos()))
  protected readonly entregado = computed(() => recibido(this.pagos()))

  protected readonly rucValido = computed(() => /^\d{11}$/.test(this.documento.trim()))

  protected readonly puedeCobrar = computed(() => {
    if (!cobroCompleto(this.totales().total, this.pagos())) return false
    if (this.comprobante() === 'FAC' && !this.rucValido()) return false
    return true
  })

  /**
   * Billetes con los que se paga de verdad, de los que circulan en Perú.
   *
   * Solo los que superan lo que falta: ofrecer «paga con 10» cuando debe 48
   * es ruido. Y como mucho tres, porque más botones cuestan más leerlos de
   * lo que ahorran.
   */
  protected readonly sugeridos = computed(() => {
    const falta = this.falta()
    return [10, 20, 50, 100, 200].filter((billete) => billete > falta).slice(0, 3)
  })

  constructor() {
    void this.cargarMedios()
  }

  private async cargarMedios(): Promise<void> {
    const lista = await this.puerto.disponibles('')
    this.medios.set(lista)
    // Efectivo preseleccionado: es con lo que se paga la mayoría, y un toque
    // menos por venta son minutos al final del turno.
    this.medioActivo.set(lista.find((medio) => medio.daVuelto) ?? lista[0] ?? null)
    this.importe = this.falta()
  }

  protected importeValido(): boolean {
    return (this.importe ?? 0) > 0
  }

  protected elegirMedio(medio: MedioPago): void {
    this.medioActivo.set(medio)
    this.referencia = ''
    this.importe = this.falta()
  }

  protected pagarCon(importe: number): void {
    this.importe = importe
    this.anadir()
  }

  protected anadir(): void {
    const medio = this.medioActivo()
    const importe = this.importe ?? 0
    if (!medio || importe <= 0) return

    // Sin vuelto no se admite exceso: se recorta a lo que falta. Cargar 40
    // en la tarjeta por un ticket de 31.40 son 8.60 que nadie devuelve.
    const aplicado = medio.daVuelto ? importe : Math.min(importe, this.falta())
    if (aplicado <= 0) return

    this.pagos.update((lista) => [
      ...lista,
      { medio, importe: aplicado, referencia: this.referencia.trim() || undefined },
    ])
    this.referencia = ''
    this.error.set(null)
    this.importe = this.falta()
  }

  protected quitar(indice: number): void {
    this.pagos.update((lista) => lista.filter((_, i) => i !== indice))
    this.importe = this.falta()
  }

  protected confirmar(): void {
    if (!this.puedeCobrar() || this.enviando()) return
    this.enviando.set(true)
    this.cobrado.emit({
      total: this.totales().total,
      pagos: this.pagos(),
      comprobante: { tipo: this.comprobante(), serie: '', numero: '' },
    })
  }

  /** Lo llama el padre si el registro falla, para soltar el botón. */
  fallo(mensaje: string): void {
    this.enviando.set(false)
    this.error.set(mensaje)
  }

  protected atajo(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.preventDefault()
      this.cancelar.emit()
      return
    }
    // Entrar aplica el importe escrito y, si ya cuadra, cobra: es el gesto
    // de una caja, teclear y confirmar sin soltar el teclado.
    if (evento.key === 'Enter') {
      evento.preventDefault()
      if (this.importeValido() && this.falta() > 0) this.anadir()
      else if (this.puedeCobrar()) this.confirmar()
    }
  }
}
