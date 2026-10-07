import { ChangeDetectionStrategy, Component } from '@angular/core'
import { FormularioAccesoComponent } from './formulario-acceso.component'
import { KarmaLogoComponent } from '../marca/karma-logo.component'

/**
 * Variante «Portada»: manifiesto a la izquierda, formulario a la derecha.
 *
 * Es la más sobria de las tres y la que mejor aguanta una pantalla ancha de
 * escritorio. En móvil el manifiesto se oculta y queda solo el formulario.
 */
@Component({
  selector: 'km-acceso-portada',
  imports: [FormularioAccesoComponent, KarmaLogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid h-full lg:grid-cols-[1.1fr_minmax(26rem,0.9fr)]">
      <section
        class="pv-fondo-vertical hidden flex-col justify-between p-12 lg:flex"
        aria-hidden="true"
      >
        <km-karma-logo />
        <div class="max-w-lg">
          <p class="pv-etiqueta text-jade-texto mb-4">Punto de venta</p>
          <h1 class="pv-titulo-pagina mb-4 text-4xl leading-tight">
            El mostrador, en una sola pantalla.
          </h1>
          <p class="text-tenue text-lg leading-relaxed">
            Un mismo ticket para todos los rubros. Lo que cambia de una tienda de ropa a una botica
            es el perfil que se carga, no la caja.
          </p>
        </div>
        <p class="text-tenue text-xs">Karma Systems · Suite de gestión</p>
      </section>

      <section class="flex items-center justify-center bg-panel p-6 sm:p-12">
        <div class="pv-fade-in w-full max-w-sm">
          <div class="mb-8 lg:hidden">
            <km-karma-logo />
          </div>
          <h2 class="pv-titulo-pagina mb-1">Iniciar turno</h2>
          <p class="text-tenue mb-8 text-sm">Entra con tu cuenta de la suite.</p>
          <km-formulario-acceso />
        </div>
      </section>
    </div>
  `,
})
export class AccesoPortadaComponent {}
