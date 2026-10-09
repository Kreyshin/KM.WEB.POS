import { describe, expect, it } from 'vitest'
import { claveDemo, SesionSimulada, usuariosDemo } from './sesion-simulada'

describe('sesión simulada', () => {
  const puerto = new SesionSimulada()

  it('devuelve una sesión completa con la clave de demo', async () => {
    const sesion = await puerto.iniciar('rquispe', claveDemo)

    expect(sesion.token).toBeTruthy()
    expect(sesion.usuario.rol).toBe('cajero')
    expect(sesion.sucursal.perfil).toBe('ropa')
  })

  it('no distingue mayúsculas ni espacios en el usuario', async () => {
    const sesion = await puerto.iniciar('  RQuispe ', claveDemo)
    expect(sesion.usuario.usuario).toBe('rquispe')
  })

  it('acepta el PIN numérico, que es por donde entra la variante de teclado', async () => {
    const sesion = await puerto.iniciar('rquispe', '1111')
    expect(sesion.usuario.id).toBe('u-1')
  })

  it('no acepta el PIN de otro usuario', async () => {
    await expect(puerto.iniciar('rquispe', '2222')).rejects.toThrow()
  })

  it('da un PIN distinto a cada usuario de ejemplo', () => {
    const pines = usuariosDemo.map((u) => u.pin)
    expect(new Set(pines).size).toBe(pines.length)
  })

  it('rechaza la clave incorrecta', async () => {
    await expect(puerto.iniciar('rquispe', 'otra')).rejects.toThrow(/usuario o clave/i)
  })

  it('rechaza un usuario que no existe', async () => {
    await expect(puerto.iniciar('nadie', claveDemo)).rejects.toThrow()
  })

  it('cubre los dos perfiles de la primera etapa en los usuarios de ejemplo', async () => {
    const perfiles = new Set<string>()
    for (const usuario of usuariosDemo) {
      const sesion = await puerto.iniciar(usuario.usuario, claveDemo)
      perfiles.add(sesion.sucursal.perfil)
    }
    expect([...perfiles].sort()).toEqual(['farmacia', 'ropa'])
  })
})
