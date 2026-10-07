import {
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  type ApplicationConfig,
} from '@angular/core'
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router'
import { routes } from './app.routes'
import { proveedoresSimulados } from '@shell/proveedores'
import { SesionStore } from '@shell/sesion/sesion.store'
import { TemaService } from '@shell/tema/tema.service'

/**
 * Configuración de arranque.
 *
 * `proveedoresSimulados` es lo único que habrá que cambiar cuando exista
 * KARMA.MS.POS: el resto de la aplicación no sabe quién hay detrás de los
 * puertos, y esa ignorancia es deliberada.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    ...proveedoresSimulados,

    /*
     * La sesión se rehidrata ANTES del primer enrutado. Si se hiciera después
     * del bootstrap, la guarda ya habría corrido sin sesión y mandaría al
     * acceso a alguien que tenía el turno abierto.
     *
     * `TemaService` se instancia aquí por el mismo motivo —fija `data-theme`—
     * aunque `index.html` ya haya puesto el valor para evitar el destello.
     */
    provideAppInitializer(() => {
      inject(TemaService)
      inject(SesionStore).restaurar()
    }),
  ],
}
