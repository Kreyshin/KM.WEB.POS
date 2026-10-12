import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IconoComponent } from './icono.component'

export interface OpcionSelect {
  valor: string
  etiqueta: string
  /** Una segunda línea: «vence 05/2027», «quedan 4». */
  detalle?: string
  deshabilitada?: boolean
}

/**
 * Select con buscador.
 *
 * La forma de `KmSelect` de KM.WEB.RESTAURANT y KM.WEB.TALLER. Existe
 * porque el `<select>` del navegador deja de servir pasadas unas quince
 * opciones: no se puede escribir para encontrar, no caben dos líneas por
 * opción, y en un mostrador eso significa recorrer treinta lotes con la
 * rueda del ratón y el cliente esperando.
 *
 * El buscador aparece a partir de `desdeCuantas` opciones, no siempre: un
 * campo de búsqueda sobre cinco unidades de medida es un trámite de más.
 *
 * Cada opción puede llevar DETALLE en una segunda línea —«vence 05/2027»,
 * «quedan 4»—, que es justo lo que un `<select>` nativo no deja enseñar y
 * lo que hace que se elija el lote correcto a la primera.
 */
@Component({
  selector: 'km-select',
  imports: [FormsModule, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="pv-select">
      <button
        class="pv-campo pv-select-mando"
        type="button"
        [attr.aria-label]="etiqueta()"
        [attr.aria-expanded]="abierto()"
        [disabled]="deshabilitado()"
        (click)="alternar()"
      >
        <span class="min-w-0 flex-1 truncate text-left" [class.text-tenue]="!elegida()">
          {{ elegida()?.etiqueta ?? marcador() }}
        </span>
        @if (elegida()?.detalle; as detalle) {
          <span class="pv-select-detalle">{{ detalle }}</span>
        }
        <km-icono [nombre]="abierto() ? 'subir' : 'bajar'" tamano="xs" />
      </button>

      @if (abierto()) {
        <div class="pv-select-lista" role="listbox" [attr.aria-label]="etiqueta()">
          @if (opciones().length >= desdeCuantas()) {
            <div class="pv-select-busca">
              <km-icono nombre="buscar" tamano="xs" />
              <input
                #busca
                type="search"
                autocomplete="off"
                placeholder="Buscar…"
                aria-label="Buscar entre las opciones"
                [ngModel]="texto()"
                (ngModelChange)="texto.set($event)"
              />
            </div>
          }

          <div class="pv-select-opciones">
            @for (opcion of visibles(); track opcion.valor) {
              <button
                class="pv-select-opcion"
                type="button"
                role="option"
                [class.pv-select-elegida]="opcion.valor === valor()"
                [attr.aria-selected]="opcion.valor === valor()"
                [disabled]="opcion.deshabilitada === true"
                (click)="elegir(opcion.valor)"
              >
                <span class="min-w-0 flex-1 text-left">
                  <span class="block truncate">{{ opcion.etiqueta }}</span>
                  @if (opcion.detalle) {
                    <span class="pv-select-detalle block">{{ opcion.detalle }}</span>
                  }
                </span>
                @if (opcion.valor === valor()) {
                  <km-icono nombre="check" tamano="xs" />
                }
              </button>
            } @empty {
              <p class="text-tenue px-3 py-3 text-xs">Nada coincide con «{{ texto() }}».</p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class SelectComponent {
  private readonly raiz = inject(ElementRef<HTMLElement>)

  readonly opciones = input.required<readonly OpcionSelect[]>()
  readonly valor = model<string>('')
  readonly etiqueta = input('Elige una opción')
  readonly marcador = input('Elige…')
  readonly deshabilitado = input(false)
  /** A partir de cuántas opciones aparece el buscador. */
  readonly desdeCuantas = input(8)

  protected readonly abierto = signal(false)
  protected readonly texto = signal('')
  private readonly busca = viewChild<ElementRef<HTMLInputElement>>('busca')

  protected readonly elegida = computed(() =>
    this.opciones().find((opcion) => opcion.valor === this.valor()),
  )

  protected readonly visibles = computed(() => {
    const buscado = normalizar(this.texto())
    if (!buscado) return this.opciones()
    return this.opciones().filter(
      (opcion) =>
        normalizar(opcion.etiqueta).includes(buscado) ||
        normalizar(opcion.detalle ?? '').includes(buscado),
    )
  })

  protected alternar(): void {
    const siguiente = !this.abierto()
    this.abierto.set(siguiente)
    if (!siguiente) return
    this.texto.set('')
    // El foco al buscador: quien abre una lista larga viene a escribir.
    queueMicrotask(() => this.busca()?.nativeElement.focus())
  }

  protected elegir(valor: string): void {
    this.valor.set(valor)
    this.abierto.set(false)
  }

  /** Un clic fuera cierra. Sin esto la lista se queda abierta por la pantalla. */
  @HostListener('document:pointerdown', ['$event'])
  protected fuera(evento: Event): void {
    if (!this.abierto()) return
    if (!this.raiz.nativeElement.contains(evento.target as Node)) this.abierto.set(false)
  }

  @HostListener('document:keydown.escape')
  protected escapar(): void {
    this.abierto.set(false)
  }
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}
