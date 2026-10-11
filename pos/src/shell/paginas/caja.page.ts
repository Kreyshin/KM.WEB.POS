import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { CajaService, MonedaPipe } from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'

/**
 * Sesión de caja.
 *
 * Tres estados y no tres pantallas, porque es una sola cosa vista en tres
 * momentos del turno:
 *
 *   SIN ABRIR → el fondo con el que se empieza. Se pide antes de vender
 *   porque sin él no hay contra qué cuadrar al final.
 *
 *   ABIERTA → el turno en marcha. Arriba lo que importa de un vistazo
 *   —efectivo esperado, ventas, desglose por medio— y debajo el libro de
 *   movimientos. Los ingresos y egresos de gaveta se anotan aquí: la plata
 *   que sale para una movilidad y no se apunta es la que falta al cerrar.
 *
 *   ARQUEO → contar y cerrar. La diferencia se enseña DESPUÉS de teclear lo
 *   contado, nunca antes: si el esperado está a la vista mientras se cuenta,
 *   deja de ser un arqueo y pasa a ser copiar un número.
 */
@Component({
  selector: 'km-caja-page',
  imports: [FormsModule, MonedaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-fade-in mx-auto flex h-full w-full max-w-5xl flex-col gap-4 overflow-auto">
      @if (!caja.sesion()) {
        <!-- Sin abrir -->
        <div class="pv-panel mx-auto mt-10 w-full max-w-md p-6">
          <h2 class="pv-titulo-seccion">Abrir caja</h2>
          <p class="text-tenue mt-1 text-sm">
            Cuenta el fondo con el que empiezas. Es el único número contra el que se cuadra al
            cerrar el turno.
          </p>

          <label class="mt-5 block">
            <span class="pv-etiqueta text-tenue">Fondo inicial</span>
            <input
              class="pv-campo pv-cifra mt-1 text-right text-xl font-semibold"
              type="number"
              min="0"
              step="10"
              [(ngModel)]="fondo"
            />
          </label>

          <div class="pv-sugeridos mt-2">
            @for (monto of fondosHabituales; track monto) {
              <button class="pv-sugerido" type="button" (click)="fondo = monto">
                {{ monto | moneda: false }}
              </button>
            }
          </div>

          <button
            class="pv-boton pv-boton-accion pv-boton-grande mt-5 w-full justify-center"
            type="button"
            [disabled]="caja.ocupada()"
            (click)="abrir()"
          >
            Abrir caja
          </button>
        </div>
      } @else if (caja.sesion(); as sesion) {
        <!-- Cabecera del turno -->
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="pv-titulo-seccion">
              Caja {{ sesion.estado === 'abierta' ? 'abierta' : 'cerrada' }}
            </h2>
            <p class="text-tenue text-sm">
              {{ sesion.usuarioNombre }} · desde {{ hora(sesion.abiertaEn) }}
              @if (sesion.cerradaEn) {
                · hasta {{ hora(sesion.cerradaEn) }}
              }
            </p>
          </div>

          @if (sesion.estado === 'abierta') {
            <div class="flex gap-2">
              <button class="pv-boton pv-boton-tenue" type="button" (click)="abrirMovimiento()">
                Ingreso o egreso
              </button>
              <button class="pv-boton pv-boton-accion" type="button" (click)="arqueando.set(true)">
                Cerrar caja
              </button>
            </div>
          }
        </header>

        <!-- Lo que importa de un vistazo -->
        <div class="pv-tarjetas-dato">
          <div class="pv-dato">
            <p class="pv-etiqueta text-tenue">Efectivo esperado</p>
            <p class="pv-dato-cifra">{{ caja.esperado() | moneda }}</p>
            <p class="text-tenue text-xs">Fondo {{ sesion.montoInicial | moneda: false }}</p>
          </div>
          <div class="pv-dato">
            <p class="pv-etiqueta text-tenue">Ventas del turno</p>
            <p class="pv-dato-cifra">{{ caja.ventas().importe | moneda }}</p>
            <p class="text-tenue text-xs">{{ caja.ventas().cuantas }} tickets</p>
          </div>
          @if (sesion.estado === 'cerrada' && sesion.conteoFinal !== undefined) {
            <div class="pv-dato">
              <p class="pv-etiqueta text-tenue">Arqueo</p>
              <p
                class="pv-dato-cifra"
                [class.text-error]="diferenciaCierre(sesion.conteoFinal) !== 0"
              >
                {{ diferenciaCierre(sesion.conteoFinal) | moneda }}
              </p>
              <p class="text-tenue text-xs">Contado {{ sesion.conteoFinal | moneda: false }}</p>
            </div>
          }
        </div>

        <!-- Desglose por medio -->
        @if (caja.porMedio().length > 0) {
          <section class="pv-panel p-4">
            <p class="pv-etiqueta text-tenue mb-3">Cobrado por medio</p>
            <div class="pv-desglose">
              @for (fila of caja.porMedio(); track fila.medio) {
                <div>
                  <p class="text-tenue text-xs">{{ nombreMedio(fila.medio) }}</p>
                  <p class="pv-cifra text-sm font-semibold">{{ fila.importe | moneda }}</p>
                </div>
              }
            </div>
          </section>
        }

        <!-- Libro de movimientos -->
        <section class="pv-panel flex min-h-0 flex-1 flex-col overflow-hidden">
          <p class="pv-etiqueta text-tenue border-b border-linea px-4 py-2.5">Movimientos</p>
          <ul class="min-h-0 flex-1 overflow-auto">
            @for (movimiento of caja.movimientos(); track movimiento.id) {
              <li class="pv-movimiento">
                <span class="pv-cifra text-tenue w-12 shrink-0 text-xs">
                  {{ hora(movimiento.en) }}
                </span>
                <span class="pv-movimiento-tipo" [attr.data-tipo]="movimiento.tipo">
                  {{ movimiento.tipo }}
                </span>
                <span class="min-w-0 flex-1 truncate text-sm">{{ movimiento.concepto }}</span>
                @if (movimiento.medio) {
                  <span class="text-tenue shrink-0 text-xs">{{
                    nombreMedio(movimiento.medio)
                  }}</span>
                }
                <span
                  class="pv-cifra w-24 shrink-0 text-right text-sm font-semibold"
                  [class.text-error]="movimiento.importe < 0"
                >
                  @if (movimiento.importe !== 0) {
                    {{ movimiento.importe | moneda }}
                  } @else {
                    —
                  }
                </span>
              </li>
            }
          </ul>
        </section>
      }
    </div>

    <!-- Ingreso o egreso de gaveta -->
    @if (moviendo()) {
      <div class="pv-velo" role="dialog" aria-modal="true" aria-label="Movimiento de caja">
        <button
          class="pv-velo-cierre"
          type="button"
          aria-label="Cerrar"
          (click)="moviendo.set(false)"
        ></button>
        <div class="pv-panel pv-entra relative w-full max-w-sm p-5">
          <h3 class="pv-titulo-seccion mb-3">Movimiento de gaveta</h3>

          <div class="mb-3 flex gap-1.5">
            <button
              class="pv-filtro-opcion"
              type="button"
              [class.pv-filtro-marcada]="signo() === 1"
              (click)="signo.set(1)"
            >
              Ingreso
            </button>
            <button
              class="pv-filtro-opcion"
              type="button"
              [class.pv-filtro-marcada]="signo() === -1"
              (click)="signo.set(-1)"
            >
              Egreso
            </button>
          </div>

          <label class="block">
            <span class="pv-etiqueta text-tenue">Concepto</span>
            <input
              class="pv-campo mt-1 text-sm"
              type="text"
              placeholder="Movilidad, pago a proveedor, cambio…"
              [(ngModel)]="concepto"
            />
          </label>

          <label class="mt-3 block">
            <span class="pv-etiqueta text-tenue">Importe</span>
            <input
              class="pv-campo pv-cifra mt-1 text-right text-lg font-semibold"
              type="number"
              min="0"
              step="1"
              [(ngModel)]="montoMovimiento"
            />
          </label>

          <button
            class="pv-boton pv-boton-accion mt-4 w-full justify-center"
            type="button"
            [disabled]="!movimientoValido()"
            (click)="anotar()"
          >
            Anotar
          </button>
        </div>
      </div>
    }

    <!-- Arqueo -->
    @if (arqueando()) {
      <div class="pv-velo" role="dialog" aria-modal="true" aria-label="Arqueo de caja">
        <button
          class="pv-velo-cierre"
          type="button"
          aria-label="Cerrar"
          (click)="arqueando.set(false)"
        ></button>
        <div class="pv-panel pv-entra relative w-full max-w-sm p-5">
          <h3 class="pv-titulo-seccion">Arqueo de caja</h3>
          <p class="text-tenue mt-1 text-sm">
            Cuenta el efectivo del cajón y escríbelo. No mires el esperado antes: si lo copias, el
            arqueo no sirve para nada.
          </p>

          <label class="mt-4 block">
            <span class="pv-etiqueta text-tenue">Efectivo contado</span>
            <input
              class="pv-campo pv-cifra mt-1 text-right text-xl font-semibold"
              type="number"
              min="0"
              step="0.10"
              [(ngModel)]="contado"
              (ngModelChange)="contadoTocado.set(true)"
            />
          </label>

          @if (contadoTocado()) {
            <div class="pv-arqueo" [class.pv-arqueo-cuadra]="diferencia() === 0">
              <div class="flex justify-between text-sm">
                <span>Esperado</span>
                <span class="pv-cifra">{{ caja.esperado() | moneda }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Contado</span>
                <span class="pv-cifra">{{ contado | moneda }}</span>
              </div>
              <div class="mt-1 flex justify-between font-semibold">
                <span>{{
                  diferencia() === 0 ? 'Cuadra' : diferencia() > 0 ? 'Sobra' : 'Falta'
                }}</span>
                <span class="pv-cifra">{{ absoluto(diferencia()) | moneda }}</span>
              </div>
            </div>
          }

          <button
            class="pv-boton pv-boton-accion mt-4 w-full justify-center"
            type="button"
            [disabled]="!contadoTocado() || caja.ocupada()"
            (click)="cerrarCaja()"
          >
            Cerrar el turno
          </button>
        </div>
      </div>
    }
  `,
})
export class CajaPage {
  protected readonly caja = inject(CajaService)
  private readonly sesion = inject(SesionStore)

  protected readonly fondosHabituales = [50, 100, 200, 300]

  protected fondo = 100
  protected contado = 0
  protected concepto = ''
  protected montoMovimiento = 0

  protected readonly moviendo = signal(false)
  protected readonly arqueando = signal(false)
  protected readonly signo = signal<1 | -1>(-1)
  protected readonly contadoTocado = signal(false)

  protected readonly diferencia = computed(() => this.caja.diferencia(this.contado))

  constructor() {
    const sucursal = this.sesion.sucursal()?.id ?? ''
    const usuario = this.sesion.usuario()?.id ?? ''
    if (sucursal && usuario) void this.caja.cargar(sucursal, usuario)
  }

  protected async abrir(): Promise<void> {
    const sucursal = this.sesion.sucursal()?.id ?? ''
    const usuario = this.sesion.usuario()
    if (!sucursal || !usuario) return
    await this.caja.abrir(sucursal, { id: usuario.id, nombre: usuario.nombre }, this.fondo)
  }

  protected abrirMovimiento(): void {
    this.concepto = ''
    this.montoMovimiento = 0
    this.signo.set(-1)
    this.moviendo.set(true)
  }

  protected movimientoValido(): boolean {
    return this.concepto.trim().length > 0 && this.montoMovimiento > 0
  }

  protected async anotar(): Promise<void> {
    if (!this.movimientoValido()) return
    await this.caja.registrar({
      tipo: this.signo() === 1 ? 'ingreso' : 'egreso',
      concepto: this.concepto.trim(),
      importe: this.montoMovimiento * this.signo(),
    })
    this.moviendo.set(false)
  }

  protected async cerrarCaja(): Promise<void> {
    await this.caja.cerrar(this.contado)
    this.arqueando.set(false)
    this.contadoTocado.set(false)
  }

  protected diferenciaCierre(contado: number): number {
    return this.caja.diferencia(contado)
  }

  protected absoluto(valor: number): number {
    return Math.abs(valor)
  }

  protected hora(iso: string): string {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  /** Códigos cortos a nombre. El cajero no lee «YAP». */
  protected nombreMedio(codigo: string): string {
    const nombres: Record<string, string> = {
      EFE: 'Efectivo',
      YAP: 'Yape',
      PLN: 'Plin',
      VIS: 'Débito',
      MST: 'Crédito',
      TRF: 'Transferencia',
    }
    return nombres[codigo] ?? codigo
  }
}
