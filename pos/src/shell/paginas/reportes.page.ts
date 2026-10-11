import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { CajaService, MonedaPipe } from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'

/**
 * Reportes del turno.
 *
 * Solo el turno en curso, y eso es deliberado. Los informes de verdad —mes
 * a mes, por vendedor, por producto, comparando sucursales— son del ERP,
 * que es quien tiene el histórico. Un POS que intenta hacer eso acaba con
 * una pantalla de informes mala y lenta.
 *
 * Lo que sí es del POS es lo que el cajero y el supervisor necesitan ANTES
 * de cerrar: cuánto se vendió, con qué se pagó, a qué hora hubo movimiento
 * y cuál fue el ticket medio. Son las preguntas que se contestan sin salir
 * del mostrador.
 */
@Component({
  selector: 'km-reportes-page',
  imports: [MonedaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-fade-in mx-auto flex h-full w-full max-w-5xl flex-col gap-4 overflow-auto">
      <header>
        <h2 class="pv-titulo-seccion">Reportes del turno</h2>
        <p class="text-tenue text-sm">
          {{ sesion.sucursal()?.nombre }} · {{ sesion.usuario()?.nombre }}
          @if (caja.sesion(); as abierta) {
            · desde {{ hora(abierta.abiertaEn) }}
          }
        </p>
      </header>

      @if (!caja.sesion()) {
        <div class="pv-panel flex flex-1 flex-col items-center justify-center gap-2 p-10">
          <p class="text-sm font-semibold">Sin turno abierto</p>
          <p class="text-tenue max-w-sm text-center text-xs">
            Los reportes salen de la sesión de caja. Abre caja para empezar a medir el turno.
          </p>
        </div>
      } @else {
        <div class="pv-tarjetas-dato">
          <div class="pv-dato">
            <p class="pv-etiqueta text-tenue">Vendido</p>
            <p class="pv-dato-cifra">{{ caja.ventas().importe | moneda }}</p>
            <p class="text-tenue text-xs">
              {{ caja.ventas().cuantas }}
              {{ caja.ventas().cuantas === 1 ? 'ticket' : 'tickets' }}
            </p>
          </div>
          <div class="pv-dato">
            <p class="pv-etiqueta text-tenue">Ticket medio</p>
            <p class="pv-dato-cifra">{{ ticketMedio() | moneda }}</p>
            <p class="text-tenue text-xs">Por venta cobrada</p>
          </div>
          <div class="pv-dato">
            <p class="pv-etiqueta text-tenue">En gaveta</p>
            <p class="pv-dato-cifra">{{ caja.esperado() | moneda }}</p>
            <p class="text-tenue text-xs">Efectivo esperado</p>
          </div>
        </div>

        <!-- Medios de pago. Barras y no una tabla: la pregunta es cuánto
             pesa cada uno, y una proporción se compara mirando, no
             restando cifras. -->
        <section class="pv-panel p-4">
          <p class="pv-etiqueta text-tenue mb-3">Cómo pagaron</p>
          @if (medios().length === 0) {
            <p class="text-tenue text-sm">Todavía no se ha cobrado nada en este turno.</p>
          } @else {
            <div class="flex flex-col gap-2.5">
              @for (fila of medios(); track fila.medio) {
                <div>
                  <div class="mb-1 flex items-baseline justify-between text-xs">
                    <span class="font-semibold">{{ nombreMedio(fila.medio) }}</span>
                    <span class="text-tenue">
                      <span class="pv-cifra">{{ fila.importe | moneda }}</span>
                      · {{ fila.porcentaje }}%
                    </span>
                  </div>
                  <div class="pv-barra">
                    <div class="pv-barra-relleno" [style.width.%]="fila.porcentaje"></div>
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <!-- Ventas por hora. Decide a qué hora conviene reforzar el
             mostrador, que es la decisión que un dueño toma con esto. -->
        <section class="pv-panel p-4">
          <p class="pv-etiqueta text-tenue mb-3">A qué hora se vendió</p>
          @if (porHora().length === 0) {
            <p class="text-tenue text-sm">Sin ventas todavía.</p>
          } @else {
            <div class="pv-horas">
              @for (franja of porHora(); track franja.hora) {
                <div class="pv-hora">
                  <div class="pv-hora-barra">
                    <div
                      class="pv-hora-relleno"
                      [style.height.%]="franja.alto"
                      [attr.title]="franja.hora + ':00 · ' + franja.importe"
                    ></div>
                  </div>
                  <span class="pv-hora-etiqueta">{{ etiquetaHora(franja.hora) }}</span>
                </div>
              }
            </div>
          }
        </section>

        <section class="pv-panel p-4">
          <p class="pv-etiqueta text-tenue mb-3">Movimientos de gaveta</p>
          @if (gaveta().length === 0) {
            <p class="text-tenue text-sm">
              Ningún ingreso ni egreso. Es lo normal en un turno limpio.
            </p>
          } @else {
            <ul class="flex flex-col gap-1">
              @for (movimiento of gaveta(); track movimiento.id) {
                <li class="flex items-center justify-between gap-3 text-sm">
                  <span class="truncate">{{ movimiento.concepto }}</span>
                  <span
                    class="pv-cifra shrink-0 font-semibold"
                    [class.text-error]="movimiento.importe < 0"
                  >
                    {{ movimiento.importe | moneda }}
                  </span>
                </li>
              }
            </ul>
          }
        </section>
      }
    </div>
  `,
})
export class ReportesPage {
  protected readonly caja = inject(CajaService)
  protected readonly sesion = inject(SesionStore)

  constructor() {
    const sucursal = this.sesion.sucursal()?.id ?? ''
    const usuario = this.sesion.usuario()?.id ?? ''
    if (sucursal && usuario && !this.caja.sesion()) void this.caja.cargar(sucursal, usuario)
  }

  protected readonly ticketMedio = computed(() => {
    const { cuantas, importe } = this.caja.ventas()
    return cuantas === 0 ? 0 : Math.round((importe / cuantas) * 100) / 100
  })

  /** Con su porcentaje, que es la pregunta real: cuánto pesa cada medio. */
  protected readonly medios = computed(() => {
    const filas = this.caja.porMedio().filter((fila) => fila.importe > 0)
    const total = filas.reduce((suma, fila) => suma + fila.importe, 0)
    return filas
      .map((fila) => ({
        ...fila,
        porcentaje: total === 0 ? 0 : Math.round((fila.importe / total) * 100),
      }))
      .sort((a, b) => b.importe - a.importe)
  })

  /**
   * Ventas por hora del turno.
   *
   * Se dibujan todas las horas transcurridas, incluidas las vacías: un
   * hueco a media mañana es información, y si solo se pintaran las horas
   * con ventas desaparecería justo eso.
   */
  protected readonly porHora = computed(() => {
    const sesion = this.caja.sesion()
    if (!sesion) return []

    const ventas = sesion.movimientos.filter((m) => m.tipo === 'venta')
    if (ventas.length === 0) return []

    const desde = new Date(sesion.abiertaEn).getHours()
    const hasta = new Date(sesion.cerradaEn ?? new Date().toISOString()).getHours()

    const cuenta = new Map<number, number>()
    for (const venta of ventas) {
      const hora = new Date(venta.en).getHours()
      cuenta.set(hora, (cuenta.get(hora) ?? 0) + venta.importe)
    }

    const maximo = Math.max(...cuenta.values(), 1)
    const franjas: { hora: number; importe: number; alto: number }[] = []
    for (let hora = desde; hora <= Math.max(hasta, desde); hora += 1) {
      const importe = Math.round((cuenta.get(hora) ?? 0) * 100) / 100
      franjas.push({ hora, importe, alto: Math.round((importe / maximo) * 100) })
    }
    return franjas
  })

  protected readonly gaveta = computed(() =>
    this.caja.movimientos().filter((m) => m.tipo === 'ingreso' || m.tipo === 'egreso'),
  )

  /** «08», «14». Con dos cifras la fila de horas queda alineada. */
  protected etiquetaHora(hora: number): string {
    return String(hora).padStart(2, '0')
  }

  protected hora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

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
