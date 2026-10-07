/**
 * Puerto de sesión.
 *
 * El POS no implementa login propio: usa el inicio de sesión de la suite. Lo
 * que hay aquí es la forma de esa sesión y el puerto que la obtiene, para que
 * el shell no dependa de cómo se autentica realmente.
 */

export const roles = ['cajero', 'vendedor', 'supervisor', 'administrador'] as const

export type Rol = (typeof roles)[number]

export interface SucursalRef {
  id: string
  nombre: string
  /** Código del perfil de rubro activo en esta sucursal. */
  perfil: string
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
}

export interface Sesion {
  token: string
  usuario: Usuario
  sucursal: SucursalRef
}

export interface PuertoSesion {
  iniciar(email: string, password: string): Promise<Sesion>
  cerrar(): Promise<void>
}
