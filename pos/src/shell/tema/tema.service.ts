import { Injectable, signal } from '@angular/core'

/**
 * Tema claro / oscuro.
 *
 * El POS arranca en OSCURO. No es una preferencia heredada del sistema: es la
 * decisión de producto, porque la caja está en interior y la pantalla queda
 * encendida toda la jornada. El claro existe y se recuerda, pero hay que
 * pedirlo.
 *
 * El atributo `data-theme` ya viene puesto en `index.html`, antes de que
 * Angular arranque, para que no haya un destello claro en el primer pintado.
 * Este servicio solo lo mantiene.
 */
export const temas = ['oscuro', 'claro'] as const

export type Tema = (typeof temas)[number]

export const temaPorDefecto: Tema = 'oscuro'

const CLAVE_TEMA = 'km.pos.tema'

/** Valor del atributo `data-theme` que espera el CSS. */
const atributo: Record<Tema, string> = { oscuro: 'dark', claro: 'light' }

export function esTema(valor: unknown): valor is Tema {
  return typeof valor === 'string' && (temas as readonly string[]).includes(valor)
}

/**
 * Lee el tema guardado. Se exporta porque `index.html` resuelve el tema inicial
 * con la misma clave y la misma regla, y conviene que haya un solo criterio.
 */
export function temaGuardado(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA)
    if (esTema(guardado)) return guardado
  } catch {
    // Sin almacenamiento: el de producto.
  }
  return temaPorDefecto
}

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly _tema = signal<Tema>(temaGuardado())

  readonly tema = this._tema.asReadonly()

  constructor() {
    this.aplicar(this._tema())
  }

  alternar(): void {
    this.cambiar(this._tema() === 'oscuro' ? 'claro' : 'oscuro')
  }

  cambiar(tema: Tema): void {
    this._tema.set(tema)
    this.aplicar(tema)
    try {
      localStorage.setItem(CLAVE_TEMA, tema)
    } catch {
      // La elección dura lo que la pestaña.
    }
  }

  private aplicar(tema: Tema): void {
    document.documentElement.setAttribute('data-theme', atributo[tema])
  }
}
