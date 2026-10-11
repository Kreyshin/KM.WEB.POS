import type { CargadorPerfilAngular } from '@pos-core-ui/index'

/**
 * Registro de perfiles de rubro.
 *
 * Es el ÚNICO lugar del repo donde se nombra un perfil, y lo hace con
 * `import()` diferido para que cada rubro viaje en su propio trozo: una caja
 * de ropa no descarga el código de farmacia. El lint prohíbe el import
 * estático de un perfil en todo el resto del repo y exime solo este archivo
 * (ver `eslint.config.js`).
 *
 * Añadir un rubro es añadir una línea aquí y una librería en `src/`. El
 * núcleo no se toca: es el objetivo de diseño de todo el repo.
 *
 * Una sucursal sin perfil registrado funciona igual: la pantalla genérica
 * del mostrador no necesita ninguno. Lo que pierde son las marcas y las
 * validaciones del rubro, que es exactamente lo que el perfil aporta.
 */
export const PERFILES: Record<string, CargadorPerfilAngular> = {
  farmacia: () => import('@perfil-farmacia').then((m) => m.perfilFarmacia),
  ropa: () => import('@perfil-ropa').then((m) => m.perfilRopa),
}

export function perfilRegistrado(codigo: string | null): boolean {
  return codigo !== null && codigo in PERFILES
}

export async function cargarPerfil(codigo: string | null) {
  if (!perfilRegistrado(codigo)) return null
  return PERFILES[codigo as string]()
}
