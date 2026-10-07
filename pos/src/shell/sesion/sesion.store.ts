import { computed, Injectable, inject, signal } from '@angular/core'
import type { Rol, Sesion } from '@pos-core/index'
import { PUERTO_SESION } from '@pos-core-ui/index'

/**
 * Sesión de la aplicación.
 *
 * Guarda la sesión activa, la rehidrata al arrancar y responde la única
 * pregunta que las guardas necesitan: ¿puede este usuario estar aquí?
 *
 * No autentica: eso lo hace quien esté detrás de `PUERTO_SESION`, hoy el
 * adaptador simulado y mañana el inicio de sesión de la suite.
 */
const CLAVE_SESION = 'km.pos.sesion'

@Injectable({ providedIn: 'root' })
export class SesionStore {
  private readonly puerto = inject(PUERTO_SESION)

  private readonly _sesion = signal<Sesion | null>(null)
  private readonly _cargando = signal(false)
  private readonly _error = signal<string | null>(null)

  readonly sesion = this._sesion.asReadonly()
  readonly cargando = this._cargando.asReadonly()
  readonly error = this._error.asReadonly()

  readonly usuario = computed(() => this._sesion()?.usuario ?? null)
  readonly sucursal = computed(() => this._sesion()?.sucursal ?? null)
  readonly autenticado = computed(() => this._sesion() !== null)
  readonly rol = computed<Rol | null>(() => this._sesion()?.usuario.rol ?? null)

  /**
   * Perfil de rubro activo. Viene de la sucursal, que lo trae la sesión: el
   * cajero no lo elige. Si un mismo local llegara a usar dos perfiles, aquí
   * es donde haría falta un selector.
   */
  readonly perfilActivo = computed(() => this._sesion()?.sucursal.perfil ?? null)

  /** ¿Tiene alguno de estos roles? Sin lista, basta con estar autenticado. */
  puede(roles?: readonly Rol[]): boolean {
    if (!this.autenticado()) return false
    if (!roles || roles.length === 0) return true
    const actual = this.rol()
    return actual !== null && roles.includes(actual)
  }

  /** Rehidrata la sesión guardada. Se llama una vez, al arrancar la app. */
  restaurar(): void {
    try {
      const crudo = localStorage.getItem(CLAVE_SESION)
      if (!crudo) return
      this._sesion.set(JSON.parse(crudo) as Sesion)
    } catch {
      // Sesión ilegible o sin almacenamiento: se empieza sin sesión.
      this.olvidar()
    }
  }

  async iniciar(email: string, password: string): Promise<boolean> {
    this._cargando.set(true)
    this._error.set(null)
    try {
      const sesion = await this.puerto.iniciar(email, password)
      this._sesion.set(sesion)
      this.recordar(sesion)
      return true
    } catch (motivo) {
      this._error.set(motivo instanceof Error ? motivo.message : 'No se pudo iniciar sesión.')
      return false
    } finally {
      this._cargando.set(false)
    }
  }

  async cerrar(): Promise<void> {
    try {
      await this.puerto.cerrar()
    } finally {
      this._sesion.set(null)
      this.olvidar()
    }
  }

  private recordar(sesion: Sesion): void {
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
    } catch {
      // Sin almacenamiento la sesión dura lo que la pestaña.
    }
  }

  private olvidar(): void {
    try {
      localStorage.removeItem(CLAVE_SESION)
    } catch {
      // Nada que limpiar.
    }
  }
}
