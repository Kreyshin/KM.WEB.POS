/**
 * Puestas en escena del acceso.
 *
 * Las tres comparten el núcleo —turnos, pad, visor y formulario de usuario y
 * clave— y cambian solo el decorado. Se comparan con `?escena=` en la URL o
 * con el selector flotante, que solo se monta en la demo.
 *
 * Cuando esté elegida, se borran las otras dos y esta tabla desaparece.
 */
export const escenas = ['mostrador', 'vitrina', 'comanda'] as const

export type Escena = (typeof escenas)[number]

export const etiquetaEscena: Record<Escena, string> = {
  mostrador: 'Mostrador',
  vitrina: 'Vitrina',
  comanda: 'Comanda',
}

export const descripcionEscena: Record<Escena, string> = {
  mostrador: 'Pantalla partida: el local ilustrado a la izquierda, el acceso a la derecha.',
  vitrina: 'Tarjeta de vidrio sobre luces en movimiento. Sin ilustración, todo CSS.',
  comanda: 'El acceso impreso en un comprobante, saliendo de la impresora.',
}

export const escenaPorDefecto: Escena = 'mostrador'

export function esEscena(valor: unknown): valor is Escena {
  return typeof valor === 'string' && (escenas as readonly string[]).includes(valor)
}
