import { ChangeDetectionStrategy, Component, output } from '@angular/core'
import { modulos } from './navegacion'

/**
 * Panel de atajos.
 *
 * Se abre con «?» y lista lo que de verdad funciona. Existe porque los
 * atajos dejaron de ir impresos en cada botón: con siete módulos, poner la
 * tecla al lado de cada uno llenaba la pantalla de ruido. Un panel bajo
 * demanda los enseña todos sin ocupar nada el resto del tiempo.
 */
@Component({
  selector: 'km-atajos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div class="pv-velo" role="dialog" aria-modal="true" aria-label="Atajos de teclado">
      <!-- El fondo es un botón de verdad, no un div con (click): así cierra
           igual con Enter y lo anuncia el lector de pantalla. -->
      <button
        class="pv-velo-cierre"
        type="button"
        aria-label="Cerrar"
        (click)="cerrar.emit()"
      ></button>

      <div class="pv-panel pv-entra relative w-full max-w-md p-6">
        <div class="mb-4 flex items-baseline justify-between">
          <h2 class="pv-titulo-seccion">Atajos</h2>
          <button class="text-tenue text-sm" type="button" (click)="cerrar.emit()">Cerrar</button>
        </div>

        <p class="text-tenue mb-4 text-xs">
          No se usan teclas de función: F1, F3, F5 y F12 son del navegador y las intercepta antes de
          que lleguen aquí.
        </p>

        <dl class="flex flex-col gap-1.5">
          <div class="pv-atajo">
            <dt>Buscar producto</dt>
            <dd><kbd class="pv-kbd">/</kbd></dd>
          </div>
          <div class="pv-atajo">
            <dt>Mover por la lista</dt>
            <dd><kbd class="pv-kbd">↑</kbd><kbd class="pv-kbd">↓</kbd></dd>
          </div>
          <div class="pv-atajo">
            <dt>Cambiar de presentación</dt>
            <dd><kbd class="pv-kbd">←</kbd><kbd class="pv-kbd">→</kbd></dd>
          </div>
          <div class="pv-atajo">
            <dt>Agregar al ticket</dt>
            <dd><kbd class="pv-kbd">Enter</kbd></dd>
          </div>
          <div class="pv-atajo">
            <dt>Ir a Cobrar</dt>
            <dd><kbd class="pv-kbd">Alt</kbd><kbd class="pv-kbd">C</kbd></dd>
          </div>
          <div class="pv-atajo">
            <dt>Limpiar la búsqueda</dt>
            <dd><kbd class="pv-kbd">Esc</kbd></dd>
          </div>

          <p class="pv-etiqueta text-tenue mt-3">Módulos</p>
          @for (modulo of modulos; track modulo.ruta) {
            <div class="pv-atajo" [class.opacity-50]="modulo.pendiente">
              <dt>{{ modulo.titulo }}</dt>
              <dd>
                <kbd class="pv-kbd">Alt</kbd><kbd class="pv-kbd">{{ modulo.tecla }}</kbd>
              </dd>
            </div>
          }
        </dl>
      </div>
    </div>
  `,
})
export class AtajosComponent {
  readonly cerrar = output<void>()
  protected readonly modulos = modulos
}
