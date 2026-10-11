import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core'
import { analizarFilas, type ErrorImportacion, type ProductoRef } from '@pos-core/index'
import { MonedaPipe } from '@pos-core-ui/index'

/**
 * Carga masiva de catálogo desde una hoja de cálculo.
 *
 * El orden de la pantalla es el del trabajo real: primero se descarga la
 * plantilla, luego se rellena fuera, luego se sube. Por eso la descarga va
 * ARRIBA y no escondida en un enlace al pie: en la primera instalación es
 * el primer paso, no una opción.
 *
 * Nada se guarda hasta confirmar. Lo que se enseña antes es una vista
 * previa con lo que entra y lo que falla, fila por fila y con el número de
 * fila de la hoja, para poder corregirla sin adivinar dónde. Importar a
 * ciegas 500 productos y descubrir el desastre después es el error que
 * esta pantalla existe para evitar.
 */
@Component({
  selector: 'km-carga-masiva',
  imports: [MonedaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div class="pv-velo" role="dialog" aria-modal="true" aria-label="Carga masiva de catálogo">
      <button
        class="pv-velo-cierre"
        type="button"
        aria-label="Cerrar"
        (click)="cerrar.emit()"
      ></button>

      <div class="pv-panel pv-entra pv-carga relative">
        <header class="flex items-center justify-between gap-3 border-b border-linea p-5">
          <div>
            <h2 class="text-base font-semibold">Carga masiva de catálogo</h2>
            <p class="text-tenue text-sm">
              Una hoja de Excel con tus productos. Nada se guarda hasta que lo confirmes.
            </p>
          </div>
          <button class="text-tenue text-sm" type="button" (click)="cerrar.emit()">Cerrar</button>
        </header>

        <div class="pv-carga-cuerpo">
          <!-- Paso 1 -->
          <section class="pv-paso-carga">
            <span class="pv-paso-numero">1</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold">Descarga la plantilla</p>
              <p class="text-tenue text-xs">
                Trae las columnas correctas, ejemplos rellenos y una hoja con qué poner en cada una.
              </p>
            </div>
            <button
              class="pv-boton pv-boton-tenue shrink-0"
              type="button"
              [disabled]="generando()"
              (click)="descargar()"
            >
              {{ generando() ? 'Generando…' : 'Descargar plantilla' }}
            </button>
          </section>

          <!-- Paso 2 -->
          <section class="pv-paso-carga">
            <span class="pv-paso-numero">2</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold">Súbela rellena</p>
              <p class="text-tenue text-xs">
                Archivos .xlsx. Una fila por forma de venta, agrupadas por código.
              </p>
            </div>
            <label class="pv-boton pv-boton-accion shrink-0 cursor-pointer">
              {{ leyendo() ? 'Leyendo…' : 'Elegir archivo' }}
              <input
                class="sr-only"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                (change)="elegir($event)"
              />
            </label>
          </section>

          @if (fallo(); as mensaje) {
            <p class="pv-aviso-error">{{ mensaje }}</p>
          }

          <!-- Paso 3: vista previa -->
          @if (analizado()) {
            <section>
              <div class="mb-3 flex flex-wrap items-center gap-2">
                <span class="pv-resumen pv-resumen-ok">
                  {{ productos().length }}
                  {{ productos().length === 1 ? 'producto listo' : 'productos listos' }}
                </span>
                @if (errores().length > 0) {
                  <span class="pv-resumen pv-resumen-mal">
                    {{ errores().length }}
                    {{ errores().length === 1 ? 'aviso' : 'avisos' }}
                  </span>
                }
                <span class="text-tenue text-xs">{{ archivo() }}</span>
              </div>

              @if (errores().length > 0) {
                <div class="pv-errores">
                  <p class="pv-etiqueta mb-2">Revisa estas filas de la hoja</p>
                  <ul class="flex flex-col gap-1">
                    @for (error of errores().slice(0, 12); track $index) {
                      <li class="flex gap-2 text-xs">
                        <span class="pv-cifra shrink-0 font-semibold">Fila {{ error.fila }}</span>
                        @if (error.columna) {
                          <span class="pv-cifra text-tenue shrink-0">{{ error.columna }}</span>
                        }
                        <span>{{ error.mensaje }}</span>
                      </li>
                    }
                    @if (errores().length > 12) {
                      <li class="text-tenue text-xs">y {{ errores().length - 12 }} más…</li>
                    }
                  </ul>
                </div>
              }

              @if (productos().length > 0) {
                <p class="pv-etiqueta text-tenue mt-4 mb-2">Lo que se va a guardar</p>
                <div class="pv-previa">
                  <table class="pv-tabla">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th class="text-right">Stock</th>
                        <th class="text-right">Formas de venta</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (producto of productos(); track producto.id) {
                        <tr>
                          <td class="pv-cifra text-xs">{{ producto.id }}</td>
                          <td>
                            <p class="truncate text-sm font-semibold">{{ producto.descripcion }}</p>
                            <p class="text-tenue text-[11px]">
                              {{ producto.categoria?.nombre ?? 'Sin categoría' }}
                            </p>
                          </td>
                          <td class="pv-cifra text-right text-sm">
                            {{ producto.stock }} {{ producto.unidadAlmacen.abreviatura }}
                          </td>
                          <td>
                            <div class="flex flex-wrap justify-end gap-1">
                              @for (pres of producto.presentaciones; track pres.id) {
                                <span class="pv-pres pv-pres-estatica">
                                  {{ pres.unidad.abreviatura }}
                                  <span class="pv-cifra font-semibold">
                                    {{ pres.precio | moneda: false }}
                                  </span>
                                </span>
                              }
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>
          }
        </div>

        <footer class="flex items-center gap-3 border-t border-linea p-4">
          @if (analizado() && productos().length > 0) {
            <p class="text-tenue flex-1 text-xs">
              Los productos con un código que ya exista se actualizarán; el resto se añadirá.
            </p>
          }
          <button
            class="pv-boton pv-boton-accion ml-auto justify-center"
            type="button"
            [disabled]="productos().length === 0 || importando()"
            (click)="confirmar()"
          >
            {{
              importando()
                ? 'Importando…'
                : 'Importar ' +
                  productos().length +
                  (productos().length === 1 ? ' producto' : ' productos')
            }}
          </button>
        </footer>
      </div>
    </div>
  `,
})
export class CargaMasivaComponent {
  readonly cerrar = output<void>()
  readonly importar = output<ProductoRef[]>()

  protected readonly generando = signal(false)
  protected readonly leyendo = signal(false)
  protected readonly importando = signal(false)
  protected readonly analizado = signal(false)
  protected readonly archivo = signal('')
  protected readonly fallo = signal<string | null>(null)

  protected readonly productos = signal<ProductoRef[]>([])
  protected readonly errores = signal<ErrorImportacion[]>([])

  protected readonly hayAlgo = computed(() => this.productos().length > 0)

  protected async descargar(): Promise<void> {
    this.generando.set(true)
    this.fallo.set(null)
    try {
      const { generarPlantilla } = await import('@pos-adaptadores/hoja/excel')
      const blob = await generarPlantilla()
      const url = URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = 'plantilla-catalogo-karma-pos.xlsx'
      enlace.click()
      // Sin esto el objeto queda en memoria hasta recargar la pestaña, y
      // una caja puede estar abierta todo el día.
      URL.revokeObjectURL(url)
    } catch (error) {
      this.fallo.set(error instanceof Error ? error.message : 'No se pudo generar la plantilla.')
    } finally {
      this.generando.set(false)
    }
  }

  protected async elegir(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement
    const archivo = entrada.files?.[0]
    if (!archivo) return

    this.leyendo.set(true)
    this.fallo.set(null)
    this.analizado.set(false)

    try {
      const { leerLibro } = await import('@pos-adaptadores/hoja/excel')
      const filas = await leerLibro(archivo)
      const { productos, errores } = analizarFilas(filas)

      this.archivo.set(`${archivo.name} · ${filas.length} filas`)
      this.productos.set(productos)
      this.errores.set(errores)
      this.analizado.set(true)

      if (productos.length === 0 && errores.length === 0) {
        this.fallo.set('La hoja no tiene filas con datos.')
      }
    } catch (error) {
      this.fallo.set(error instanceof Error ? error.message : 'No se pudo leer el archivo.')
    } finally {
      this.leyendo.set(false)
      // Permite volver a elegir el MISMO archivo tras corregirlo, que es
      // justo lo que se hace al arreglar errores.
      entrada.value = ''
    }
  }

  protected confirmar(): void {
    if (this.productos().length === 0 || this.importando()) return
    this.importando.set(true)
    this.importar.emit(this.productos())
  }

  /** Lo llama el padre si la importación falla, para soltar el botón. */
  fallar(mensaje: string): void {
    this.importando.set(false)
    this.fallo.set(mensaje)
  }
}
