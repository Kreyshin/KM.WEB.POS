import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'
import { IconoComponent, type NombreIcono } from './icono.component'

/**
 * Botón de solo icono, con su explicación al pasar por encima.
 *
 * Portado de `KmBotonIcono` de KM.WEB.RESTAURANT y KM.WEB.TALLER: la
 * forma, no el color. Un icono sin texto ahorra espacio y lo cobra en
 * adivinanza, así que el globo no es un adorno —es la mitad del
 * componente—. Por eso la etiqueta es obligatoria.
 *
 * El globo se dibuja con posición FIJA y coordenadas calculadas, no como
 * hijo del botón: dentro de una tabla con desbordamiento, un globo
 * absoluto lo recorta el contenedor o le genera barra de desplazamiento.
 *
 * `contexto` no se ve, pero completa el nombre accesible —«Editar
 * Paracetamol»— para quien navega con lector de pantalla y oye una fila
 * detrás de otra con ocho botones que se llaman todos «Editar».
 */
@Component({
  selector: 'km-boton-icono',
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button
      #boton
      class="pv-boton-icono"
      type="button"
      [class.pv-boton-icono-peligro]="tono() === 'peligro'"
      [class.pv-boton-icono-marcado]="marcado()"
      [attr.aria-label]="nombreAccesible()"
      [attr.aria-pressed]="marcado() ? true : null"
      [disabled]="deshabilitado()"
      (click)="pulsar.emit()"
      (mouseenter)="mostrar(boton)"
      (mouseleave)="visible.set(false)"
      (focus)="mostrar(boton)"
      (blur)="visible.set(false)"
    >
      <km-icono [nombre]="icono()" [tamano]="tamano()" />
    </button>

    @if (visible() && !deshabilitado()) {
      <span
        class="pv-globo"
        role="presentation"
        [class.pv-globo-debajo]="debajo()"
        [style.top.px]="arriba()"
        [style.left.px]="izq()"
      >
        {{ etiqueta() }}
      </span>
    }
  `,
})
export class BotonIconoComponent {
  readonly icono = input.required<NombreIcono>()
  /** Lo que dice el globo: «Editar». Obligatoria: un icono solo no se explica. */
  readonly etiqueta = input.required<string>()
  /** Sobre qué actúa: «Paracetamol». No se ve; completa el nombre accesible. */
  readonly contexto = input('')
  readonly tono = input<'neutro' | 'peligro'>('neutro')
  readonly tamano = input<'xs' | 'sm' | 'md' | 'lg'>('sm')
  readonly deshabilitado = input(false)
  /** Para los que son un interruptor y no una acción: encendido o apagado. */
  readonly marcado = input(false)

  readonly pulsar = output<void>()

  protected readonly visible = signal(false)
  protected readonly arriba = signal(0)
  protected readonly izq = signal(0)

  protected readonly nombreAccesible = computed(() =>
    this.contexto() ? `${this.etiqueta()} ${this.contexto()}` : this.etiqueta(),
  )

  protected readonly debajo = signal(false)

  protected mostrar(boton: HTMLElement): void {
    const caja = boton.getBoundingClientRect()

    // Encima salvo que no quepa: un botón de la primera fila de la pantalla
    // tendría el globo fuera de ella.
    const cabeEncima = caja.top > 44
    this.debajo.set(!cabeEncima)
    this.arriba.set(Math.round(cabeEncima ? caja.top - 6 : caja.bottom + 6))

    /*
     * Y acotado a los lados.
     *
     * El globo va centrado sobre el botón, así que uno pegado al borde
     * derecho —que es donde viven las acciones de una cabecera— se salía
     * de la pantalla y se leía «Cargar un Excel con varios p…». Se calcula
     * el ancho a ojo por el número de letras, que basta para no pasarse:
     * fallar por dentro solo descentra un poco el globo.
     */
    const margen = 8
    const mitad = Math.min(this.etiqueta().length * 3.6, 140)
    const centro = caja.left + caja.width / 2
    const tope = window.innerWidth - margen - mitad
    this.izq.set(Math.round(Math.max(margen + mitad, Math.min(centro, tope))))

    this.visible.set(true)
  }
}
