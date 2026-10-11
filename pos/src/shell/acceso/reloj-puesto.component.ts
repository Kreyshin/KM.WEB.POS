import { ChangeDetectionStrategy, Component, signal, type OnDestroy } from '@angular/core'

/**
 * Fecha y hora del puesto.
 *
 * No es relleno: es lo primero que un cajero comprueba al abrir turno, porque
 * la hora del puesto es la que acaba en el comprobante y en el arqueo. Un
 * reloj desfasado se descubre aquí o no se descubre hasta el cierre.
 *
 * Se refresca cada 30 s y no cada segundo: en el minuto no se nota y evita
 * un repintado por segundo en una pantalla que puede quedarse abierta horas.
 */
@Component({
  selector: 'km-reloj-puesto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <p class="pv-cifra text-2xl font-semibold tabular-nums">{{ hora() }}</p>
    <p class="text-tenue mt-0.5 text-xs capitalize">{{ fecha() }}</p>
  `,
})
export class RelojPuestoComponent implements OnDestroy {
  protected readonly hora = signal('')
  protected readonly fecha = signal('')

  private readonly latido = setInterval(() => this.refrescar(), 30_000)

  constructor() {
    this.refrescar()
  }

  ngOnDestroy(): void {
    clearInterval(this.latido)
  }

  private refrescar(): void {
    const ahora = new Date()
    this.hora.set(
      ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
    )
    this.fecha.set(
      ahora.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    )
  }
}
