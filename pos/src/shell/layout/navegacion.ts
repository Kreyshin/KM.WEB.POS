import type { Rol } from '@pos-core/index'

/**
 * Destinos del shell.
 *
 * Es una lista plana, no un árbol de módulos y secciones como en las otras
 * verticales de la suite. Un POS no se navega: el cajero vive en el mostrador
 * y solo sale de ahí para cosas puntuales (revisar los pedidos por cobrar,
 * cuadrar la caja, cambiar el tema). Cuatro destinos caben en una barra; un
 * árbol de dos niveles para cuatro destinos es ceremonia inútil.
 *
 * Cada destino lleva su tecla, porque el mostrador se opera con el teclado.
 * Un destino sin tecla es un destino al que no se va a menudo.
 */
export interface Destino {
  ruta: string
  titulo: string
  /** Tecla de acceso directo, mostrada junto al nombre. */
  tecla: string
  roles?: readonly Rol[]
  /** ¿Lleva la columna del ticket al lado? Solo las pantallas de venta. */
  conTicket?: boolean
}

export const destinos: readonly Destino[] = [
  { ruta: '/venta', titulo: 'Mostrador', tecla: 'F1', conTicket: true },
  { ruta: '/venta/por-cobrar', titulo: 'Por cobrar', tecla: 'F3' },
  {
    ruta: '/caja',
    titulo: 'Caja',
    tecla: 'F4',
    roles: ['cajero', 'supervisor', 'administrador'],
  },
  { ruta: '/ajustes', titulo: 'Ajustes', tecla: 'F9' },
]

export function destinoDeRuta(url: string): Destino | undefined {
  const limpia = url.split('?')[0]
  // El más específico primero: '/venta/por-cobrar' no debe caer en '/venta'.
  return [...destinos]
    .sort((a, b) => b.ruta.length - a.ruta.length)
    .find((destino) => limpia === destino.ruta || limpia.startsWith(destino.ruta + '/'))
}

export function destinoDeTecla(tecla: string): Destino | undefined {
  return destinos.find((destino) => destino.tecla === tecla)
}
