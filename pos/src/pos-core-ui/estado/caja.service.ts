import { computed, inject, Injectable, signal } from '@angular/core'
import {
  arquear,
  diferenciaArqueo,
  diferenciaTotal,
  efectivoEsperado,
  esperadoPorMedio,
  politicaCajaPorDefecto,
  resumenVentas,
  totalPorMedio,
  type Cobro,
  type ConteoMedio,
  type MedioPago,
  type MovimientoCaja,
  type PoliticaCaja,
  type SesionCaja,
} from '@pos-core/index'
import { PUERTO_CAJA, PUERTO_MEDIOS_PAGO } from '../puertos/tokens'

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
  private readonly mediosPago = inject(PUERTO_MEDIOS_PAGO)

  private readonly estado = signal<SesionCaja | null>(null)
  private readonly cargando = signal(false)

  /*
   * Los medios se guardan aquí porque el arqueo los necesita: hay que
   * contar TODOS, no solo los que tuvieron movimiento. Un medio en cero que
   * no se enseña es un medio que nadie comprueba.
   */
  private readonly medios = signal<readonly MedioPago[]>([])
  private readonly politicaCaja = signal<PoliticaCaja>(politicaCajaPorDefecto)

  readonly mediosDeCaja = this.medios.asReadonly()
  /** Si quien cuenta ve lo esperado. Lo decide la sucursal, no la pantalla. */
  readonly cierreCiego = computed(() => this.politicaCaja().cierreCiego)
  readonly esperadoDeCadaMedio = computed(() => {
    const sesion = this.estado()
    return sesion ? esperadoPorMedio(sesion, this.medios()) : []
  })

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
      const [sesion, medios, politica] = await Promise.all([
        this.puerto.actual(sucursalId, usuarioId),
        this.mediosPago.disponibles(sucursalId),
        this.puerto.politica(sucursalId),
      ])
      this.estado.set(sesion)
      this.medios.set(medios)
      this.politicaCaja.set(politica)
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

  /**
   * Cierra el turno con lo contado medio por medio.
   *
   * El arqueo se hace AQUÍ, con la función pura del núcleo, y lo que viaja
   * al puerto es el resultado: así el número que se guarda es exactamente
   * el que el cajero tenía delante al firmar.
   */
  /**
   * Anota una devolución en efectivo. Sale de la gaveta.
   *
   * Importe NEGATIVO y tipo propio: así el efectivo esperado baja y el
   * resumen del turno puede enseñar lo vendido neto sin que nadie reste de
   * cabeza. Si se devolvió como saldo a favor no se llama: no salió plata.
   */
  async anotarDevolucion(ticketId: string, importe: number, concepto: string): Promise<void> {
    if (!this.estado() || importe <= 0) return
    await this.registrar({
      tipo: 'devolucion',
      concepto,
      medio: 'EFE',
      importe: -Math.abs(importe),
      ticketId,
    })
  }

  async cerrar(contado: Readonly<Record<string, number>>, nota?: string): Promise<void> {
    const sesion = this.estado()
    if (!sesion) return
    this.cargando.set(true)
    try {
      const conteo = arquear(sesion, this.medios(), contado)
      this.estado.set(await this.puerto.cerrar(sesion.id, conteo, nota))
    } finally {
      this.cargando.set(false)
    }
  }

  /** El arqueo tal y como quedaría ahora mismo, para enseñarlo antes de firmar. */
  arqueo(contado: Readonly<Record<string, number>>): readonly ConteoMedio[] {
    const sesion = this.estado()
    return sesion ? arquear(sesion, this.medios(), contado) : []
  }

  diferenciaDe(contado: Readonly<Record<string, number>>): number {
    return diferenciaTotal(this.arqueo(contado))
  }

  /** Al cambiar de turno la caja del anterior no puede seguir en memoria. */
  limpiar(): void {
    this.estado.set(null)
  }
}
