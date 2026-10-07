import { ChangeDetectionStrategy, Component, input } from '@angular/core'

/**
 * Marcador de pantalla pendiente.
 *
 * El plan avanza hito por hito y el shell ya enruta pantallas que todavía no
 * existen. En vez de dejar rutas muertas, cada una declara qué hito la llena:
 * así la demo se puede recorrer completa y se ve el plan, no un hueco.
 */
@Component({
  selector: 'km-pendiente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="pv-panel pv-filo-firma pv-fade-in mx-auto max-w-2xl overflow-hidden p-8">
      <p class="pv-etiqueta text-bronce-texto mb-3">{{ hito() }}</p>
      <h1 class="pv-titulo-pagina mb-3">{{ titulo() }}</h1>
      <p class="text-tenue leading-relaxed">{{ detalle() }}</p>
    </section>
  `,
})
export class PendienteComponent {
  readonly titulo = input.required<string>()
  readonly hito = input.required<string>()
  readonly detalle = input.required<string>()
}
