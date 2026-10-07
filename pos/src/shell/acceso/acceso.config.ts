/**
 * Variantes de la pantalla de acceso.
 *
 * Las tres comparten lógica, tipografía y paleta; cambian la puesta en escena.
 * La elegida se fija aquí y se puede previsualizar con `?acceso=` en la URL,
 * que es como se comparan sin tocar código.
 */
export const variantesAcceso = ['portada', 'mostrador', 'teclado'] as const

export type VarianteAcceso = (typeof variantesAcceso)[number]

export const etiquetaVariante: Record<VarianteAcceso, string> = {
  portada: 'Portada',
  mostrador: 'Mostrador',
  teclado: 'Teclado',
}

export const descripcionVariante: Record<VarianteAcceso, string> = {
  portada: 'Manifiesto a la izquierda, formulario a la derecha.',
  mostrador: 'El cajón de la caja, con un turno por gaveta.',
  teclado: 'Acceso por teclado numérico, sin soltar el escáner.',
}

/** La que se sirve por defecto. */
export const varianteAccesoPorDefecto: VarianteAcceso = 'mostrador'

export function esVarianteAcceso(valor: unknown): valor is VarianteAcceso {
  return typeof valor === 'string' && (variantesAcceso as readonly string[]).includes(valor)
}
