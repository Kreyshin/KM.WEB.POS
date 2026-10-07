import type { Rol } from '@pos-core/index'

/**
 * Mapa de navegación del shell.
 *
 * Es declarativo a propósito: la barra de módulos y el menú de secciones lo
 * leen, y las guardas de rol salen de aquí mismo. Añadir una pantalla es
 * añadir una entrada, no tocar tres componentes.
 */
export interface Seccion {
  ruta: string
  titulo: string
  roles?: readonly Rol[]
}

export interface Modulo {
  codigo: string
  titulo: string
  /** Glifo del rail. Se sustituirá por el set de iconos de la suite. */
  glifo: string
  secciones: readonly Seccion[]
}

export const modulos: readonly Modulo[] = [
  {
    codigo: 'venta',
    titulo: 'Venta',
    glifo: '▦',
    secciones: [
      { ruta: '/venta', titulo: 'Mostrador' },
      { ruta: '/venta/por-cobrar', titulo: 'Pedidos por cobrar' },
    ],
  },
  {
    codigo: 'caja',
    titulo: 'Caja',
    glifo: '▤',
    secciones: [
      { ruta: '/caja', titulo: 'Sesión de caja', roles: ['cajero', 'supervisor', 'administrador'] },
    ],
  },
  {
    codigo: 'ajustes',
    titulo: 'Ajustes',
    glifo: '⚙',
    secciones: [{ ruta: '/ajustes', titulo: 'Preferencias' }],
  },
]

export function moduloDeRuta(url: string): Modulo | undefined {
  // El más específico primero, para que '/venta/por-cobrar' no caiga en otro módulo.
  return [...modulos]
    .sort((a, b) => b.codigo.length - a.codigo.length)
    .find((modulo) => modulo.secciones.some((seccion) => url.startsWith(seccion.ruta)))
}
