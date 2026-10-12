import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
  caminoDeAnulacion,
  devolubles,
  esDevolucionTotal,
  importeDevuelto,
  motivosNotaCredito,
  politicaDevolucionPorDefecto,
  problemaDeDevolucion,
  type Devolucion,
  type LineaDevuelta,
  type MotivoNota,
  type VentaCobrada,
} from '@pos-core/index'
import {
  BotonIconoComponent,
  IconoComponent,
  IconoProductoComponent,
  MonedaPipe,
  CajaService,
  PUERTO_DEVOLUCIONES,
  SelectComponent,
} from '@pos-core-ui/index'
import { SesionStore } from '../sesion/sesion.store'

/**
 * Devoluciones y anulación de ventas.
 *
 * Es la pantalla que faltaba para que el POS fuera utilizable: el carrito
 * tenía `anular()` desde el primer día y ninguna pantalla lo llamaba, así
 * que una devolución se arreglaba por fuera del sistema y la caja no
 * cuadraba nunca.
 *
 * El flujo es el del mostrador: se busca la venta —por comprobante, por
 * cliente o por producto, porque el cliente trae lo que trae—, se marca lo
 * que vuelve, se dice por qué, y el sistema propone el camino.
 *
 * EL CAMINO SE PROPONE, NO SE IMPONE. Dentro del plazo cabe la baja, fuera
 * solo la nota, y hay empresas que no dan de baja nunca. Lo que no se
 * puede es que el código decida el proceso de una empresa.
 */
@Component({
  selector: 'km-devoluciones-page',
  imports: [
    FormsModule,
    MonedaPipe,
    IconoComponent,
    IconoProductoComponent,
    BotonIconoComponent,
    SelectComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-fade-in mx-auto flex h-full w-full max-w-5xl flex-col gap-3 overflow-auto">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="pv-titulo-seccion">Devoluciones</h2>
          <p class="text-tenue text-sm">
            Busca la venta por comprobante, cliente o producto. El cliente trae lo que trae.
          </p>
        </div>
        <div class="pv-campo-icono w-72">
          <km-icono nombre="buscar" />
          <input
            type="search"
            placeholder="B001-00000012, Elena, paracetamol…"
            aria-label="Buscar la venta"
            [ngModel]="texto()"
            (ngModelChange)="buscar($event)"
          />
        </div>
      </header>

      @if (!elegida()) {
        <div class="pv-panel min-h-0 flex-1 overflow-auto">
          <table class="pv-tabla">
            <thead>
              <tr>
                <th>Comprobante</th>
                <th>Cuándo</th>
                <th class="hidden md:table-cell">Cliente</th>
                <th class="text-right">Total</th>
                <th class="w-12"></th>
              </tr>
            </thead>
            <tbody>
              @for (venta of ventas(); track venta.ticketId) {
                <tr>
                  <td class="pv-cifra text-sm font-semibold">
                    {{ venta.comprobante.serie }}-{{ venta.comprobante.numero }}
                  </td>
                  <td class="text-tenue text-xs">{{ cuando(venta.emitidoEn) }}</td>
                  <td class="text-tenue hidden text-xs md:table-cell">
                    {{ venta.cliente ?? '—' }}
                  </td>
                  <td class="pv-cifra text-right text-sm font-semibold">
                    {{ venta.total | moneda: false }}
                  </td>
                  <td>
                    <km-boton-icono
                      icono="flecha"
                      etiqueta="Devolver de esta venta"
                      [contexto]="venta.comprobante.serie + '-' + venta.comprobante.numero"
                      (pulsar)="abrir(venta)"
                    />
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-tenue py-10 text-center text-sm">
                    @if (texto()) {
                      Ninguna venta coincide.
                    } @else {
                      Todavía no hay ventas cobradas en este puesto.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <!-- La devolución de una venta concreta -->
        <div class="pv-panel flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="pv-cifra text-sm font-semibold">
                {{ elegida()!.comprobante.serie }}-{{ elegida()!.comprobante.numero }}
              </p>
              <p class="text-tenue text-xs">
                {{ cuando(elegida()!.emitidoEn) }} · {{ elegida()!.total | moneda: false }}
                @if (previas().length > 0) {
                  · ya tuvo {{ previas().length }}
                  {{ previas().length === 1 ? 'devolución' : 'devoluciones' }}
                }
              </p>
            </div>
            <km-boton-icono icono="cerrar" etiqueta="Volver a la lista" (pulsar)="cerrar()" />
          </div>

          <!-- Qué vuelve -->
          <section>
            <p class="pv-etiqueta text-tenue mb-2">Qué vuelve</p>
            <div class="flex flex-col gap-1.5">
              @for (fila of filas(); track fila.linea.id) {
                <div
                  class="pv-devolucion-fila"
                  [class.pv-devolucion-agotada]="fila.disponible === 0"
                >
                  <km-icono-producto [clave]="fila.linea.icono" [tamano]="28" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold">
                      {{ fila.linea.descripcion }}
                    </span>
                    <span class="text-tenue text-xs">
                      {{ fila.linea.unidad.nombre }} ·
                      {{ fila.linea.precioUnitario | moneda: false }} c/u
                      @if (fila.disponible < fila.linea.cantidad) {
                        · quedan {{ fila.disponible }} de {{ fila.linea.cantidad }}
                      }
                    </span>
                  </span>
                  <input
                    class="pv-campo pv-cifra w-20 text-right text-sm"
                    type="number"
                    min="0"
                    [max]="fila.disponible"
                    step="1"
                    placeholder="0"
                    [disabled]="fila.disponible === 0"
                    [attr.aria-label]="'Cuántas vuelven de ' + fila.linea.descripcion"
                    [ngModel]="vueltas()[fila.linea.id] ?? null"
                    (ngModelChange)="cambiarCantidad(fila.linea.id, $event, fila.disponible)"
                  />
                  <button
                    class="pv-marca-conmuta"
                    type="button"
                    [disabled]="fila.disponible === 0"
                    (click)="cambiarCantidad(fila.linea.id, fila.disponible, fila.disponible)"
                  >
                    todo
                  </button>
                </div>
              }
            </div>
          </section>

          <!-- Por qué -->
          <section class="grid gap-3 sm:grid-cols-2">
            <div class="block">
              <span class="pv-etiqueta-campo">Motivo</span>
              <km-select
                class="mt-1 block"
                etiqueta="Motivo de la devolución"
                [opciones]="opcionesMotivo"
                [valor]="motivoCodigo()"
                (valorChange)="motivoCodigo.set($event)"
              />
            </div>
            <label class="block">
              <span class="pv-etiqueta-campo">Quién autoriza</span>
              <input
                class="pv-campo mt-1 text-sm"
                type="text"
                [placeholder]="usuario()"
                [(ngModel)]="autoriza"
                (ngModelChange)="tocar()"
              />
            </label>
            <label class="sm:col-span-2 block">
              <span class="pv-etiqueta-campo">Qué pasó (opcional)</span>
              <input
                class="pv-campo mt-1 text-sm"
                type="text"
                placeholder="Vino fallada, el cliente se equivocó de talla…"
                [(ngModel)]="detalle"
              />
            </label>
          </section>

          <!-- Qué va a pasar -->
          <section class="pv-resumen-devolucion">
            <div class="flex items-baseline justify-between">
              <span class="pv-etiqueta text-tenue">Se devuelve</span>
              <span class="pv-cifra text-xl font-bold">{{ importe() | moneda }}</span>
            </div>

            <p class="text-tenue mt-1 text-xs">
              @if (camino() === 'baja') {
                <!-- La baja borra la venta del mundo: se informa que ese
                     comprobante no se emitió. Solo cabe dentro del plazo y
                     solo si vuelve todo. -->
                Se dará de baja el comprobante: la venta deja de existir.
              } @else {
                Se emitirá una nota de crédito que corrige la venta.
              }
              @if (!total()) {
                Vuelve una parte, así que no cabe la baja.
              } @else if (yaCorregida()) {
                Este comprobante ya tiene una nota, así que no cabe la baja.
              }
            </p>

            @if (politica().devuelveEfectivo) {
              <div class="mt-3 flex gap-1.5">
                @for (opcion of formasDevolver; track opcion.valor) {
                  <button
                    class="pv-marca-conmuta"
                    type="button"
                    [class.pv-marca-puesta]="comoSeDevuelve() === opcion.valor"
                    [disabled]="opcion.valor === 'saldo' && camino() === 'baja'"
                    (click)="comoSeDevuelve.set(opcion.valor)"
                  >
                    {{ opcion.etiqueta }}
                  </button>
                }
              </div>
            } @else {
              <p class="text-tenue mt-2 text-xs">
                Esta empresa no devuelve efectivo: queda como saldo a favor del cliente.
              </p>
            }
          </section>

          <footer class="flex items-center gap-3">
            @if (problema(); as mensaje) {
              <p class="pv-error-campo flex-1">{{ mensaje }}</p>
            }
            @if (hecha(); as resultado) {
              <p class="flex-1 text-sm font-semibold text-[var(--pv-exito)]">
                Registrada.
                @if (resultado.nota) {
                  Nota {{ resultado.nota.serie }}-{{ resultado.nota.numero }}.
                } @else {
                  Comprobante dado de baja.
                }
              </p>
            }
            <button
              class="pv-boton pv-boton-accion ml-auto justify-center"
              type="button"
              [disabled]="!!problema() || guardando() || !!hecha()"
              (click)="confirmar()"
            >
              <km-icono nombre="check" />
              {{ camino() === 'baja' ? 'Anular la venta' : 'Emitir nota de crédito' }}
            </button>
          </footer>
        </div>
      }
    </div>
  `,
})
export class DevolucionesPage {
  private readonly puerto = inject(PUERTO_DEVOLUCIONES)
  private readonly sesion = inject(SesionStore)
  private readonly caja = inject(CajaService)

  protected readonly formasDevolver = [
    { valor: 'efectivo' as const, etiqueta: 'Devolver en efectivo' },
    { valor: 'saldo' as const, etiqueta: 'Dejar como saldo a favor' },
  ]
  protected readonly opcionesMotivo = motivosNotaCredito.map((motivo) => ({
    valor: motivo.codigo,
    etiqueta: motivo.etiqueta,
  }))

  protected readonly texto = signal('')
  protected readonly ventas = signal<readonly VentaCobrada[]>([])
  protected readonly elegida = signal<VentaCobrada | null>(null)
  protected readonly previas = signal<readonly Devolucion[]>([])
  protected readonly politica = signal(politicaDevolucionPorDefecto)
  protected readonly vueltas = signal<Record<string, number>>({})
  protected readonly motivoCodigo = signal('07')
  protected readonly comoSeDevuelve = signal<'efectivo' | 'saldo'>('efectivo')
  protected readonly guardando = signal(false)
  protected readonly hecha = signal<Devolucion | null>(null)
  protected readonly cambios = signal(0)

  protected autoriza = ''
  protected detalle = ''

  protected readonly usuario = computed(() => this.sesion.usuario()?.nombre ?? '')

  protected readonly filas = computed(() => {
    const venta = this.elegida()
    return venta ? devolubles(venta.lineas, this.previas()) : []
  })

  private readonly lineasVueltas = computed<LineaDevuelta[]>(() =>
    Object.entries(this.vueltas())
      .filter(([, cantidad]) => cantidad > 0)
      .map(([lineaId, cantidad]) => ({ lineaId, cantidad })),
  )

  protected readonly motivo = computed<MotivoNota | null>(
    () => motivosNotaCredito.find((m) => m.codigo === this.motivoCodigo()) ?? null,
  )

  protected readonly importe = computed(() => {
    const venta = this.elegida()
    return venta ? importeDevuelto(venta.lineas, this.lineasVueltas()) : 0
  })

  protected readonly total = computed(() => {
    const venta = this.elegida()
    return venta ? esDevolucionTotal(venta.lineas, this.lineasVueltas(), this.previas()) : false
  })

  protected readonly yaCorregida = computed(() =>
    this.previas().some((previa) => previa.camino === 'nota'),
  )

  protected readonly camino = computed(() => {
    const venta = this.elegida()
    if (!venta) return 'nota' as const
    return caminoDeAnulacion(
      { tipo: venta.comprobante.tipo, emitidoEn: venta.emitidoEn },
      this.politica(),
      !this.total(),
      new Date(),
      // Si ya se le emitió una nota, el comprobante tiene historia.
      this.previas().some((previa) => previa.camino === 'nota'),
    )
  })

  protected readonly problema = computed<string | null>(() => {
    this.cambios()
    const venta = this.elegida()
    if (!venta) return null
    return problemaDeDevolucion(
      venta.lineas,
      this.lineasVueltas(),
      this.motivo(),
      this.autoriza.trim() || this.usuario(),
      this.politica(),
      this.previas(),
    )
  })

  constructor() {
    void this.cargar()
  }

  private async cargar(): Promise<void> {
    const sucursalId = this.sesion.sucursal()?.id ?? ''
    const [ventas, politica] = await Promise.all([
      this.puerto.ventasDevolubles(sucursalId, this.texto()),
      this.puerto.politica(sucursalId),
    ])
    this.ventas.set(ventas)
    this.politica.set(politica)
    if (!politica.devuelveEfectivo) this.comoSeDevuelve.set('saldo')
  }

  protected buscar(texto: string): void {
    this.texto.set(texto)
    void this.cargar()
  }

  protected async abrir(venta: VentaCobrada): Promise<void> {
    this.elegida.set(venta)
    this.vueltas.set({})
    this.hecha.set(null)
    this.detalle = ''
    this.autoriza = ''
    this.previas.set(await this.puerto.previas(venta.ticketId))
    this.tocar()
  }

  protected cerrar(): void {
    this.elegida.set(null)
    this.hecha.set(null)
    void this.cargar()
  }

  protected cambiarCantidad(lineaId: string, valor: unknown, disponible: number): void {
    const cantidad = Math.min(Math.max(0, Math.floor(Number(valor) || 0)), disponible)
    this.vueltas.update((actual) => ({ ...actual, [lineaId]: cantidad }))
    this.tocar()
  }

  protected tocar(): void {
    this.cambios.update((n) => n + 1)
  }

  protected async confirmar(): Promise<void> {
    const venta = this.elegida()
    const motivo = this.motivo()
    if (!venta || !motivo || this.problema()) return

    this.guardando.set(true)
    try {
      // Una baja no deja saldo: el comprobante no existió, así que no hay
      // nota que gastar después. El dinero vuelve y punto.
      const comoSeDevolvio = this.camino() === 'baja' ? 'efectivo' : this.comoSeDevuelve()
      this.hecha.set(
        await this.puerto.registrar({
          ticketId: venta.ticketId,
          comprobanteOrigen: venta.comprobante,
          en: new Date().toISOString(),
          lineas: this.lineasVueltas(),
          motivo,
          detalle: this.detalle.trim() || undefined,
          camino: this.camino(),
          autorizadoPor: this.autoriza.trim() || this.usuario(),
          importe: this.importe(),
          comoSeDevolvio,
        }),
      )
      /*
       * Si salió plata, la caja se entera.
       *
       * Sin esto el arqueo del cierre saldría corto por el importe de cada
       * devolución del turno, y el cajero cargaría con una diferencia que
       * no es suya.
       */
      if (comoSeDevolvio === 'efectivo') {
        await this.caja.anotarDevolucion(
          venta.ticketId,
          this.importe(),
          `Devolución ${venta.comprobante.serie}-${venta.comprobante.numero}`,
        )
      }

      this.previas.set(await this.puerto.previas(venta.ticketId))
    } finally {
      this.guardando.set(false)
    }
  }

  protected cuando(iso: string): string {
    const fecha = new Date(iso)
    return fecha.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}
