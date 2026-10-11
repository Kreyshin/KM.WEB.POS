import type { Rol } from '@pos-core/index'

/**
 * Mapa de navegación del sistema.
 *
 * Es una lista de MÓDULOS, no de pantallas sueltas: el POS no es una caja
 * registradora con una sola vista, es un sistema con venta, caja, catálogo,
 * clientes y reportes. Que se vean todos desde el primer día, aunque varios
 * estén por construir, es lo que hace que se lea como un sistema.
 *
 * Los que aún no existen van marcados como `pendiente`: se enseñan apagados
 * y no se puede entrar. Esconderlos haría que el producto pareciera más
 * pequeño de lo que es; fingir que funcionan sería peor.
 */
export interface Modulo {
  ruta: string
  titulo: string
  /** Clave del glifo. El rail la dibuja; ver `IconoModuloComponent`. */
  icono: string
  /** Atajo: Alt + esta tecla. Las F las intercepta el navegador. */
  tecla: string
  roles?: readonly Rol[]
  /** ¿Lleva la columna del ticket al lado? Solo las pantallas de venta. */
  conTicket?: boolean
  /** Visible pero no navegable: existe en el plan, no en el código. */
  pendiente?: boolean
}

export const modulos: readonly Modulo[] = [
  { ruta: '/venta', titulo: 'Mostrador', icono: 'mostrador', tecla: '1', conTicket: true },
  { ruta: '/venta/por-cobrar', titulo: 'Por cobrar', icono: 'pendientes', tecla: '2' },
  {
    ruta: '/caja',
    titulo: 'Caja',
    icono: 'caja',
    tecla: '3',
    roles: ['cajero', 'supervisor', 'administrador'],
  },
  { ruta: '/catalogo', titulo: 'Catálogo', icono: 'catalogo', tecla: '4' },
  { ruta: '/clientes', titulo: 'Clientes', icono: 'clientes', tecla: '5' },
  {
    ruta: '/reportes',
    titulo: 'Reportes',
    icono: 'reportes',
    tecla: '6',
    roles: ['supervisor', 'administrador'],
  },
  { ruta: '/ajustes', titulo: 'Ajustes', icono: 'ajustes', tecla: '9' },
]

export function moduloDeRuta(url: string): Modulo | undefined {
  const limpia = url.split('?')[0]
  // El más específico primero: '/venta/por-cobrar' no debe caer en '/venta'.
  return [...modulos]
    .sort((a, b) => b.ruta.length - a.ruta.length)
    .find((modulo) => limpia === modulo.ruta || limpia.startsWith(modulo.ruta + '/'))
}

export function moduloDeTecla(tecla: string): Modulo | undefined {
  return modulos.find((modulo) => modulo.tecla === tecla)
}
