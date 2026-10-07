import { inject } from '@angular/core'
import { Router, type CanActivateFn } from '@angular/router'
import type { Rol } from '@pos-core/index'
import { SesionStore } from '../sesion/sesion.store'

/**
 * Guardas de sesión.
 *
 * `exigeSesion` protege todo lo que no sea el acceso; `exigeRol` lo afina
 * donde haga falta. Ninguna de las dos autentica: solo preguntan al store, que
 * es quien sabe.
 */
export const exigeSesion: CanActivateFn = (_ruta, estado) => {
  const sesion = inject(SesionStore)
  const router = inject(Router)

  if (sesion.autenticado()) return true

  // Se recuerda a dónde iba para volver ahí después de entrar.
  return router.createUrlTree(['/acceso'], { queryParams: { destino: estado.url } })
}

export function exigeRol(...roles: Rol[]): CanActivateFn {
  return () => {
    const sesion = inject(SesionStore)
    const router = inject(Router)

    if (!sesion.autenticado()) return router.createUrlTree(['/acceso'])
    if (sesion.puede(roles)) return true
    return router.createUrlTree(['/sin-permiso'])
  }
}

/** Evita que alguien ya autenticado vuelva a la pantalla de acceso. */
export const exigeAnonimo: CanActivateFn = () => {
  const sesion = inject(SesionStore)
  const router = inject(Router)
  return sesion.autenticado() ? router.createUrlTree(['/venta']) : true
}
