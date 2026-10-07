/**
 * Sesión en memoria.
 *
 * Sustituye al inicio de sesión de la suite mientras no exista KARMA.MS.POS.
 * Acepta cualquiera de los usuarios de ejemplo con la contraseña `demo`, y es
 * lo que hace que la demo publicada en Pages se pueda recorrer de verdad.
 *
 * No valida nada en serio a propósito: su única responsabilidad es devolver
 * una `Sesion` con la forma correcta.
 */
import type { PuertoSesion, Sesion, SucursalRef, Usuario } from '@pos-core/index'

const CLAVE_DEMO = 'demo'

const sucursales: Record<string, SucursalRef> = {
  'suc-lima-ropa': { id: 'suc-lima-ropa', nombre: 'Tienda Miraflores', perfil: 'ropa' },
  'suc-lima-farmacia': { id: 'suc-lima-farmacia', nombre: 'Botica San Isidro', perfil: 'farmacia' },
}

interface UsuarioDemo {
  usuario: Usuario
  sucursalId: string
  /**
   * PIN numérico. Existe porque la variante «Teclado» solo marca dígitos: con
   * la clave de texto el pad no podría entrar nunca. En una caja real el PIN
   * lo emite el servidor; aquí es parte del juego de datos.
   */
  pin: string
}

const usuarios: UsuarioDemo[] = [
  {
    usuario: {
      id: 'u-1',
      nombre: 'Rosa Quispe',
      email: 'cajero@karma.pe',
      rol: 'cajero',
    },
    sucursalId: 'suc-lima-ropa',
    pin: '1111',
  },
  {
    usuario: {
      id: 'u-2',
      nombre: 'Luis Tirado',
      email: 'vendedor@karma.pe',
      rol: 'vendedor',
    },
    sucursalId: 'suc-lima-ropa',
    pin: '2222',
  },
  {
    usuario: {
      id: 'u-3',
      nombre: 'Elena Mori',
      email: 'quimico@karma.pe',
      rol: 'supervisor',
    },
    sucursalId: 'suc-lima-farmacia',
    pin: '3333',
  },
  {
    usuario: {
      id: 'u-4',
      nombre: 'Karma Admin',
      email: 'admin@karma.pe',
      rol: 'administrador',
    },
    sucursalId: 'suc-lima-farmacia',
    pin: '4444',
  },
]

/** Los que la pantalla de acceso ofrece como atajo en la demo. */
export const usuariosDemo = usuarios.map(({ usuario, pin }) => ({ ...usuario, pin }))

export const claveDemo = CLAVE_DEMO

export class SesionSimulada implements PuertoSesion {
  async iniciar(email: string, password: string): Promise<Sesion> {
    // Latencia corta para que el estado «cargando» se note en la demo.
    await new Promise((listo) => setTimeout(listo, 220))

    const encontrado = usuarios.find(
      (candidato) => candidato.usuario.email.toLowerCase() === email.trim().toLowerCase(),
    )
    // Se acepta la clave de texto o el PIN del pad numérico: son la misma
    // credencial por dos caminos de entrada distintos.
    const claveValida = password === CLAVE_DEMO || password === encontrado?.pin
    if (!encontrado || !claveValida) {
      throw new Error('Correo o contraseña incorrectos.')
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
