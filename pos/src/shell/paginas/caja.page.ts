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
            <span class="pv-etiqueta-campo">Fondo inicial</span>
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
            <p class="text-tenue text-xs">Fondo {{ sesion.fondoInicial | moneda: false }}</p>
          </div>
          <div class="pv-dato">
            <p class="pv-etiqueta text-tenue">Ventas del turno</p>
            <p class="pv-dato-cifra">{{ caja.ventas().importe | moneda }}</p>
            <p class="text-tenue text-xs">
              {{ caja.ventas().cuantas }} {{ caja.ventas().cuantas === 1 ? 'ticket' : 'tickets' }}
            </p>
          </div>
          @if (sesion.estado === 'cerrada' && sesion.diferencia !== undefined) {
            <div class="pv-dato">
              <p class="pv-etiqueta text-tenue">Arqueo</p>
              <!-- La diferencia GUARDADA, no recalculada: el número firmado
                   tiene que ser el que el cajero vio, aunque mañana cambie
                   la forma de calcularlo. -->
              <p class="pv-dato-cifra" [class.text-error]="sesion.diferencia !== 0">
                {{ sesion.diferencia | moneda }}
              </p>
              @if (sesion.nota) {
                <p class="text-tenue text-xs">{{ sesion.nota }}</p>
              } @else {
                <p class="text-tenue text-xs">{{ (sesion.conteo ?? []).length }} medios contados</p>
              }
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
            <span class="pv-etiqueta-campo">Concepto</span>
            <input
              class="pv-campo mt-1 text-sm"
              type="text"
              placeholder="Movilidad, pago a proveedor, cambio…"
              [(ngModel)]="concepto"
            />
          </label>

          <label class="mt-3 block">
            <span class="pv-etiqueta-campo">Importe</span>
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
        <div class="pv-panel pv-entra relative w-full max-w-md p-5">
          <h3 class="pv-titulo-seccion">Arqueo de caja</h3>
          <p class="text-tenue mt-1 text-sm">
            @if (caja.cierreCiego()) {
              Cuenta cada medio y escríbelo. El esperado aparece después: si lo copias, el arqueo no
              mide nada.
            } @else {
              Cuenta cada medio y escríbelo al lado de lo esperado.
            }
          </p>

          <!--
            TODOS los medios, no solo el efectivo.

            El cierre de solo efectivo detecta el cajón descuadrado, que es
            el descuadre que ya se nota. Lo que no detectaba era el total de
            tarjeta que no cuadra con el voucher del POS bancario ni el de
            Yape contra el extracto, y ese nadie lo ve hasta fin de mes
            porque nadie lo está contando.
          -->
          <div class="pv-arqueo-tabla mt-4">
            @for (fila of caja.esperadoDeCadaMedio(); track fila.medio) {
              <div class="pv-arqueo-fila">
                <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ fila.nombre }}</span>

                <!-- Cada fila revela SU esperado, no el de todas.
                     Teclear el efectivo destapaba de golpe lo esperado en
                     tarjeta y en Yape, y entonces el cierre ciego solo
                     protegía al primer medio que se contara. -->
                @if (!caja.cierreCiego() || contado()[fila.medio] !== undefined) {
                  <span class="pv-cifra w-20 text-right text-xs opacity-55">
                    {{ fila.esperado | moneda: false }}
                  </span>
                } @else {
                  <span class="w-20 text-right text-xs opacity-30" aria-hidden="true">—</span>
                }

                <input
                  class="pv-campo pv-cifra pv-arqueo-campo"
                  type="number"
                  min="0"
                  step="0.10"
                  [attr.aria-label]="'Contado en ' + fila.nombre"
                  [ngModel]="contado()[fila.medio] ?? null"
                  (ngModelChange)="contar(fila.medio, $event)"
                />

                @if (contado()[fila.medio] !== undefined) {
                  <span
                    class="pv-cifra w-20 text-right text-xs font-semibold"
                    [class.text-error]="diferenciaDe(fila.medio) !== 0"
                    [class.opacity-40]="diferenciaDe(fila.medio) === 0"
                  >
                    {{
                      diferenciaDe(fila.medio) === 0
                        ? 'cuadra'
                        : (diferenciaDe(fila.medio) | moneda: false)
                    }}
                  </span>
                } @else {
                  <span class="w-20" aria-hidden="true"></span>
                }
              </div>
            }
          </div>

          @if (tocado()) {
            <div class="pv-arqueo mt-3" [class.pv-arqueo-cuadra]="diferencia() === 0">
              <div class="flex justify-between font-semibold">
                <span>{{
                  diferencia() === 0 ? 'El turno cuadra' : diferencia() > 0 ? 'Sobra' : 'Falta'
                }}</span>
                <span class="pv-cifra">{{ absoluto(diferencia()) | moneda }}</span>
              </div>
            </div>

            <!-- Una diferencia sin explicación es una diferencia que nadie
                 investiga. No se exige, porque exigirla enseña a escribir
                 «ok» para poder cerrar y marcharse. -->
            @if (diferencia() !== 0) {
              <label class="mt-3 block">
                <span class="pv-etiqueta-campo">Qué pasó (opcional)</span>
                <input
                  class="pv-campo mt-1 text-sm"
                  type="text"
                  placeholder="Vuelto de más a un cliente, movilidad sin anotar…"
                  [(ngModel)]="nota"
                />
              </label>
            }
          }

          <button
            class="pv-boton pv-boton-accion mt-4 w-full justify-center"
            type="button"
            [disabled]="!tocado() || caja.ocupada()"
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
  protected concepto = ''
  protected nota = ''
  protected montoMovimiento = 0

  protected readonly moviendo = signal(false)
  protected readonly arqueando = signal(false)
  protected readonly signo = signal<1 | -1>(-1)

  /** Lo contado, por código de medio. Vacío hasta que alguien teclea. */
  protected readonly contado = signal<Record<string, number>>({})
  protected readonly tocado = signal(false)

  protected readonly arqueo = computed(() => this.caja.arqueo(this.contado()))
  protected readonly diferencia = computed(() => this.caja.diferenciaDe(this.contado()))

  protected contar(medio: string, valor: number | null): void {
    this.contado.update((actual) => ({ ...actual, [medio]: Number(valor) || 0 }))
    this.tocado.set(true)
  }

  protected diferenciaDe(medio: string): number {
    return this.arqueo().find((fila) => fila.medio === medio)?.diferencia ?? 0
  }

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
    await this.caja.cerrar(this.contado(), this.nota)
    this.arqueando.set(false)
    this.tocado.set(false)
    this.contado.set({})
    this.nota = ''
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
