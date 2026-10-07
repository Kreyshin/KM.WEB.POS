import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { NgComponentOutlet } from '@angular/common'
import type { Type } from '@angular/core'
import {
  esVarianteAcceso,
  varianteAccesoPorDefecto,
  type VarianteAcceso,
} from '../acceso/acceso.config'
import { AccesoMostradorComponent } from '../acceso/acceso-mostrador.component'
import { AccesoPortadaComponent } from '../acceso/acceso-portada.component'
import { AccesoTecladoComponent } from '../acceso/acceso-teclado.component'
import { SelectorVarianteComponent } from '../acceso/selector-variante.component'

/**
 * Pantalla de acceso. Elige qué variante se muestra y no hace nada más: la
 * autenticación vive en `SesionStore`, y cada variante solo pone la escena.
 *
 * El orden de preferencia es URL → elección previa → la del producto. Así un
 * enlace con `?acceso=teclado` enseña esa variante a quien lo abra, sin
 * arrastrar la preferencia de quien lo envió.
 */
const CLAVE = 'km.pos.acceso'

@Component({
  selector: 'km-acceso-page',
  imports: [NgComponentOutlet, SelectorVarianteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full">
      <ng-container *ngComponentOutlet="vista()" />
      @if (demo) {
        <km-selector-variante [(variante)]="variante" />
      }
    </div>
  `,
})
export class AccesoPage {
  private readonly router = inject(Router)

  protected readonly demo = KM_DEMO
  protected readonly variante = signal<VarianteAcceso>(this.inicial())

  private readonly componentes: Record<VarianteAcceso, Type<unknown>> = {
    portada: AccesoPortadaComponent,
    mostrador: AccesoMostradorComponent,
    teclado: AccesoTecladoComponent,
  }

  protected readonly vista = computed(() => this.componentes[this.variante()])

  constructor() {
    effect(() => {
      const elegida = this.variante()
      try {
        localStorage.setItem(CLAVE, elegida)
      } catch {
        // La elección dura lo que la pestaña.
      }
      void this.router.navigate([], {
        queryParams: { acceso: elegida },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
    })
  }

  private inicial(): VarianteAcceso {
    const consulta = this.router.parseUrl(this.router.url).queryParams['acceso']
    if (esVarianteAcceso(consulta)) return consulta
    try {
      const guardada = localStorage.getItem(CLAVE)
      if (esVarianteAcceso(guardada)) return guardada
    } catch {
      // Sin almacenamiento disponible: se usa la del producto.
    }
    return varianteAccesoPorDefecto
  }
}
