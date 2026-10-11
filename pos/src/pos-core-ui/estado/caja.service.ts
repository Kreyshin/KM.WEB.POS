import { computed, inject, Injectable, signal } from '@angular/core'
import {
  diferenciaArqueo,
  efectivoEsperado,
  resumenVentas,
  totalPorMedio,
  type Cobro,
  type MovimientoCaja,
  type SesionCaja,
} from '@pos-core/index'
import { PUERTO_CAJA } from '../puertos/tokens'

/**
 * La sesión de caja del turno, como señales.
 *
 * Es un servicio y no un store del núcleo porque aquí no hay reglas que
 * proteger: los cálculos del arqueo son funciones puras que ya viven en
 * `pos-core/modelo/caja`. Esto solo mantiene en memoria la sesión viva y
 * la comparte entre la cabecera, el panel de cobro y la pantalla de caja,
 * que es lo que no puede estar duplicado.
 */
@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly puerto = inject(PUERTO_CAJA)

  private readonly estado = signal<SesionCaja | null>(null)
  private readonly cargando = signal(false)

  readonly sesion = this.estado.asReadonly()
  readonly ocupada = this.cargando.asReadonly()
  readonly abierta = computed(() => this.estado()?.estado === 'abierta')

  readonly esperado = computed(() => {
    const sesion = this.estado()
    return sesion ? efectivoEsperado(sesion) : 0
  })

  readonly porMedio = computed(() => {
    const sesion = this.estado()
    return sesion ? totalPorMedio(sesion) : []
  })

  readonly ventas = computed(() => {
    const sesion = this.estado()
    return sesion ? resumenVentas(sesion) : { cuantas: 0, importe: 0 }
  })

  /** Movimientos del más reciente al más antiguo: así se lee un turno. */
  readonly movimientos = computed(() => [...(this.estado()?.movimientos ?? [])].reverse())

  diferencia(contado: number): number {
    const sesion = this.estado()
    return sesion ? diferenciaArqueo(sesion, contado) : 0
  }

  async cargar(sucursalId: string, usuarioId: string): Promise<void> {
    this.cargando.set(true)
    try {
      this.estado.set(await this.puerto.actual(sucursalId, usuarioId))
    } finally {
      this.cargando.set(false)
    }
  }

  async abrir(
    sucursalId: string,
    usuario: { id: string; nombre: string },
    monto: number,
  ): Promise<void> {
    this.cargando.set(true)
    try {
      this.estado.set(await this.puerto.abrir(sucursalId, usuario, monto))
    } finally {
      this.cargando.set(false)
    }
  }

  async registrar(movimiento: Omit<MovimientoCaja, 'id' | 'en'>): Promise<void> {
    const sesion = this.estado()
    if (!sesion) return
    this.estado.set(await this.puerto.registrar(sesion.id, movimiento))
  }

  /**
   * Anota un cobro en la caja.
   *
   * Un movimiento POR MEDIO y no uno por ticket: en un pago mixto los 20
   * en efectivo van al cajón y los 11.40 de Yape no, y el arqueo tiene que
   * poder separarlos. El vuelto no se anota porque ya está descontado de lo
   * que entra por efectivo.
   */
  async anotarCobro(ticketId: string, cobro: Cobro, concepto: string): Promise<void> {
    const sesion = this.estado()
    if (!sesion) return

    let restante = cobro.total
    for (const pago of cobro.pagos) {
      if (restante <= 0) break
      const entra = Math.min(pago.importe, restante)
      restante = Math.round((restante - entra) * 100) / 100
      await this.registrar({
        tipo: 'venta',
        concepto,
        medio: pago.medio.codigo,
        importe: entra,
        ticketId,
      })
    }
  }

  async cerrar(contado: number): Promise<void> {
    const sesion = this.estado()
    if (!sesion) return
    this.cargando.set(true)
    try {
      this.estado.set(await this.puerto.cerrar(sesion.id, contado))
    } finally {
      this.cargando.set(false)
    }
  }

  /** Al cambiar de turno la caja del anterior no puede seguir en memoria. */
  limpiar(): void {
    this.estado.set(null)
  }
}
