import type { PuertoSesion, Sesion, SucursalRef, Usuario } from '@pos-core/index'

/**
 * Sesión en memoria.
 *
 * Sustituye al inicio de sesión de la suite mientras no exista KARMA.MS.POS.
 * Es lo que hace que la demo publicada se pueda recorrer de verdad.
 *
 * No valida nada en serio a propósito: su única responsabilidad es devolver
 * una `Sesion` con la forma correcta.
 */
const CLAVE_DEMO = 'demo'

const sucursales: Record<string, SucursalRef> = {
  'suc-lima-ropa': { id: 'suc-lima-ropa', nombre: 'Tienda Miraflores', perfil: 'ropa' },
  'suc-lima-farmacia': { id: 'suc-lima-farmacia', nombre: 'Botica San Isidro', perfil: 'farmacia' },
}

interface UsuarioDemo {
  usuario: Usuario
  sucursalId: string
  /**
   * PIN numérico. El acceso del mostrador se marca con el pulgar, así que la
   * credencial de uso diario es el PIN; usuario y clave quedan para quien
   * entra desde fuera del turno. En una caja real el PIN lo emite el
   * servidor; aquí es parte del juego de datos.
   */
  pin: string
}

const usuarios: UsuarioDemo[] = [
  {
    usuario: { id: 'u-1', nombre: 'Rosa Quispe', usuario: 'rquispe', rol: 'cajero' },
    sucursalId: 'suc-lima-ropa',
    pin: '1111',
  },
  {
    usuario: { id: 'u-2', nombre: 'Luis Tirado', usuario: 'ltirado', rol: 'vendedor' },
    sucursalId: 'suc-lima-ropa',
    pin: '2222',
  },
  {
    usuario: { id: 'u-3', nombre: 'Elena Mori', usuario: 'emori', rol: 'supervisor' },
    sucursalId: 'suc-lima-farmacia',
    pin: '3333',
  },
  {
    usuario: { id: 'u-4', nombre: 'Karma Admin', usuario: 'admin', rol: 'administrador' },
    sucursalId: 'suc-lima-farmacia',
    pin: '4444',
  },
]

/** Los turnos que la pantalla de acceso ofrece como atajo en la demo. */
export const usuariosDemo = usuarios.map(({ usuario, pin }) => ({ ...usuario, pin }))

export const claveDemo = CLAVE_DEMO

export class SesionSimulada implements PuertoSesion {
  async iniciar(usuario: string, clave: string): Promise<Sesion> {
    // Latencia corta para que el estado «entrando» se note en la demo.
    await new Promise((listo) => setTimeout(listo, 220))

    const encontrado = usuarios.find(
      (candidato) => candidato.usuario.usuario.toLowerCase() === usuario.trim().toLowerCase(),
    )

    // Se acepta la clave de texto o el PIN del pad numérico: son la misma
    // credencial por dos caminos de entrada distintos.
    const claveValida = clave === CLAVE_DEMO || clave === encontrado?.pin
    if (!encontrado || !claveValida) {
      throw new Error('Usuario o clave incorrectos.')
    }

    const sucursal = sucursales[encontrado.sucursalId]
    if (!sucursal) {
      throw new Error('La sucursal del usuario no existe.')
    }

    return {
      token: `demo.${encontrado.usuario.id}.${Date.now()}`,
      usuario: encontrado.usuario,
      sucursal,
    }
  }

  async cerrar(): Promise<void> {
    // Sin servidor no hay nada que invalidar.
  }
}
