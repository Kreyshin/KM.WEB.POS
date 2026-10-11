import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Type,
} from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { Router } from '@angular/router'
import { escenaPorDefecto, esEscena, type Escena } from '../acceso/escenas/escenas.config'
import { SelectorEscenaComponent } from '../acceso/escenas/selector-escena.component'
import { EscenaComandaComponent } from '../acceso/escenas/escena-comanda.component'
import { EscenaMostradorComponent } from '../acceso/escenas/escena-mostrador.component'
import { EscenaVitrinaComponent } from '../acceso/escenas/escena-vitrina.component'

/**
 * Acceso al puesto.
 *
 * Elige qué puesta en escena se monta y no hace nada más: el acceso vive en
 * `km-nucleo-acceso` y cada escena solo pone el decorado.
 *
 * El orden de preferencia es URL → elección previa → la del producto, así que
 * un enlace con `?escena=comanda` enseña esa variante a quien lo abra sin
 * arrastrar la preferencia de quien lo envió.
 */
const CLAVE = 'km.pos.escena'

@Component({
  selector: 'km-acceso-page',
  imports: [NgComponentOutlet, SelectorEscenaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full">
      <ng-container *ngComponentOutlet="vista()" />
      @if (demo) {
        <km-selector-escena [(escena)]="escena" />
      }
    </div>
  `,
})
export class AccesoPage {
  private readonly router = inject(Router)

  protected readonly demo = KM_DEMO
  protected readonly escena = signal<Escena>(this.inicial())

  private readonly componentes: Record<Escena, Type<unknown>> = {
    mostrador: EscenaMostradorComponent,
    vitrina: EscenaVitrinaComponent,
    comanda: EscenaComandaComponent,
  }

  protected readonly vista = computed(() => this.componentes[this.escena()])

  constructor() {
    effect(() => {
      const elegida = this.escena()
      try {
        localStorage.setItem(CLAVE, elegida)
      } catch {
        // La elección dura lo que la pestaña.
      }
      void this.router.navigate([], {
        queryParams: { escena: elegida },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
    })
  }

  private inicial(): Escena {
    const consulta = this.router.parseUrl(this.router.url).queryParams['escena']
    if (esEscena(consulta)) return consulta
    try {
      const guardada = localStorage.getItem(CLAVE)
      if (esEscena(guardada)) return guardada
    } catch {
      // Sin almacenamiento disponible: la del producto.
    }
    return escenaPorDefecto
  }
}
