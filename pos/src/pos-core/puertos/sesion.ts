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
  /**
   * Nombre de usuario con el que inicia sesión.
   *
   * No es un correo, y no hay correo en este modelo: en un mostrador el
   * cajero no tiene cuenta de correo de la empresa, y escribir una dirección
   * con el cliente esperando es una fricción que no se justifica. La
   * identificación es usuario y clave, o turno y PIN.
   */
  usuario: string
  rol: Rol
}

export interface Sesion {
  token: string
  usuario: Usuario
  sucursal: SucursalRef
}

export interface PuertoSesion {
  iniciar(usuario: string, clave: string): Promise<Sesion>
  cerrar(): Promise<void>
}
