import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { documentoValido, tiposDocumento, type Cliente, type TipoDocumento } from '@pos-core/index'
import { PUERTO_CLIENTES } from '@pos-core-ui/index'

/**
 * Clientes.
 *
 * El POS no es un CRM, y esta pantalla no pretende serlo. Un cliente aquí
 * es lo mínimo para dos cosas: emitir el comprobante con los datos
 * correctos y reconocer al que vuelve.
 *
 * Lo que sí se cuida es el documento. Un RUC mal escrito invalida la
 * factura ante SUNAT y se descubre al día siguiente, cuando el cliente ya
 * no está. Por eso se valida al teclear y no al guardar, y por eso la
 * tarjeta avisa cuando un cliente no puede recibir factura: es mejor
 * saberlo antes de cobrar que después de emitir.
 */
@Component({
  selector: 'km-clientes-page',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-fade-in mx-auto flex h-full w-full max-w-5xl flex-col gap-4">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="pv-titulo-seccion">Clientes</h2>
          <p class="text-tenue text-sm">
            Lo justo para emitir el comprobante y reconocer al que vuelve.
          </p>
        </div>
        <div class="flex gap-2">
          <input
            class="pv-campo w-56 text-sm"
            type="search"
            placeholder="Nombre o documento…"
            aria-label="Buscar cliente"
            [ngModel]="texto()"
            (ngModelChange)="buscar($event)"
          />
          <button class="pv-boton pv-boton-accion" type="button" (click)="nuevo()">
            Nuevo cliente
          </button>
        </div>
      </header>

      @if (clientes().length === 0) {
        <div class="pv-panel flex flex-1 flex-col items-center justify-center gap-2 p-10">
          <p class="text-sm font-semibold">Sin clientes que coincidan</p>
          <p class="text-tenue text-xs">Puedes darlo de alta con «Nuevo cliente».</p>
        </div>
      } @else {
        <ul class="grid gap-2.5 overflow-auto pb-1 md:grid-cols-2 xl:grid-cols-3">
          @for (cliente of clientes(); track cliente.id) {
            <li class="pv-cliente">
              <div class="flex items-start gap-3">
                <span class="pv-avatar-cliente">{{ iniciales(cliente.nombre) }}</span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold">{{ cliente.nombre }}</p>
                  <p class="pv-cifra text-tenue text-xs">
                    {{ cliente.tipoDocumento }} {{ cliente.documento }}
                  </p>
                </div>
                @if (cliente.tipoDocumento === 'RUC') {
                  <span class="pv-marca-ficha">factura</span>
                }
              </div>

              <dl class="pv-cliente-datos">
                @if (cliente.telefono) {
                  <div>
                    <dt>Teléfono</dt>
                    <dd class="pv-cifra">{{ cliente.telefono }}</dd>
                  </div>
                }
                @if (cliente.direccion) {
                  <div>
                    <dt>Dirección</dt>
                    <dd class="truncate">{{ cliente.direccion }}</dd>
                  </div>
                }
                <div>
                  <dt>Compras</dt>
                  <dd>{{ cliente.compras ?? 0 }}</dd>
                </div>
                <div>
                  <dt>Última</dt>
                  <dd>{{ cuando(cliente.ultimaCompra) }}</dd>
                </div>
              </dl>

              <button class="pv-tabla-accion self-start" type="button" (click)="editar(cliente)">
                Editar
              </button>
            </li>
          }
        </ul>
      }
    </div>

    @if (editando()) {
      <div class="pv-velo" role="dialog" aria-modal="true" aria-label="Datos del cliente">
        <button
          class="pv-velo-cierre"
          type="button"
          aria-label="Cerrar"
          (click)="editando.set(false)"
        ></button>
        <div class="pv-panel pv-entra relative w-full max-w-sm p-5">
          <h3 class="pv-titulo-seccion mb-4">
            {{ borrador.id ? 'Editar cliente' : 'Nuevo cliente' }}
          </h3>

          <p class="pv-etiqueta text-tenue mb-1.5">Tipo de documento</p>
          <div class="mb-3 flex flex-wrap gap-1.5">
            @for (tipo of tipos; track tipo) {
              <button
                class="pv-filtro-opcion"
                type="button"
                [class.pv-filtro-marcada]="borrador.tipoDocumento === tipo"
                (click)="borrador.tipoDocumento = tipo"
              >
                {{ tipo }}
              </button>
            }
          </div>

          <label class="block">
            <span class="pv-etiqueta text-tenue">Documento</span>
            <input
              class="pv-campo pv-cifra mt-1 text-sm"
              type="text"
              [(ngModel)]="borrador.documento"
              aria-label="Número de documento"
            />
          </label>
          @if (borrador.documento && !docValido()) {
            <p class="pv-error-campo">{{ pista() }}</p>
          }

          <label class="mt-3 block">
            <span class="pv-etiqueta text-tenue">Nombre o razón social</span>
            <input class="pv-campo mt-1 text-sm" type="text" [(ngModel)]="borrador.nombre" />
          </label>

          <label class="mt-3 block">
            <span class="pv-etiqueta text-tenue">Teléfono</span>
            <input class="pv-campo mt-1 text-sm" type="tel" [(ngModel)]="borrador.telefono" />
          </label>

          @if (borrador.tipoDocumento === 'RUC') {
            <label class="mt-3 block">
              <span class="pv-etiqueta text-tenue">Dirección fiscal</span>
              <input class="pv-campo mt-1 text-sm" type="text" [(ngModel)]="borrador.direccion" />
            </label>
          }

          <button
            class="pv-boton pv-boton-accion mt-4 w-full justify-center"
            type="button"
            [disabled]="!puedeGuardar()"
            (click)="guardar()"
          >
            Guardar
          </button>
        </div>
      </div>
    }
  `,
})
export class ClientesPage {
  private readonly puerto = inject(PUERTO_CLIENTES)

  protected readonly tipos = tiposDocumento

  protected readonly texto = signal('')
  protected readonly clientes = signal<readonly Cliente[]>([])
  protected readonly editando = signal(false)

  /* El borrador es un objeto llano y no señales: es un formulario corto
     con `ngModel`, y envolverlo en señales añadiría ruido sin ganar nada. */
  protected borrador: Partial<Cliente> & { tipoDocumento: TipoDocumento } = {
    tipoDocumento: 'DNI',
    documento: '',
    nombre: '',
  }

  /* Se recalcula al teclear: validar al guardar llega tarde, porque el
     cajero ya pasó a otra cosa. */
  protected readonly cambios = signal(0)
  protected readonly docValido = computed(() => {
    this.cambios()
    return documentoValido(this.borrador.tipoDocumento, this.borrador.documento ?? '')
  })

  constructor() {
    void this.cargar()
  }

  private async cargar(): Promise<void> {
    this.clientes.set(await this.puerto.buscar(this.texto()))
  }

  protected buscar(texto: string): void {
    this.texto.set(texto)
    void this.cargar()
  }

  protected nuevo(): void {
    this.borrador = { tipoDocumento: 'DNI', documento: '', nombre: '' }
    this.editando.set(true)
  }

  protected editar(cliente: Cliente): void {
    this.borrador = { ...cliente }
    this.editando.set(true)
  }

  protected puedeGuardar(): boolean {
    return (
      (this.borrador.nombre ?? '').trim().length > 2 &&
      documentoValido(this.borrador.tipoDocumento, this.borrador.documento ?? '')
    )
  }

  protected async guardar(): Promise<void> {
    if (!this.puedeGuardar()) return
    await this.puerto.guardar({
      id: this.borrador.id,
      tipoDocumento: this.borrador.tipoDocumento,
      documento: (this.borrador.documento ?? '').trim(),
      nombre: (this.borrador.nombre ?? '').trim(),
      telefono: this.borrador.telefono?.trim() || undefined,
      direccion: this.borrador.direccion?.trim() || undefined,
      compras: this.borrador.compras,
      ultimaCompra: this.borrador.ultimaCompra,
    })
    this.editando.set(false)
    await this.cargar()
  }

  protected pista(): string {
    const tipo = this.borrador.tipoDocumento
    if (tipo === 'DNI') return 'Un DNI son 8 dígitos.'
    if (tipo === 'RUC') return 'Un RUC son 11 dígitos y empieza por 10, 15, 17 o 20.'
    return 'Entre 6 y 15 caracteres.'
  }

  protected iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase()
  }

  /** «Hoy», «ayer», «hace 19 días». Una fecha exacta aquí no dice nada. */
  protected cuando(iso?: string): string {
    if (!iso) return 'Nunca'
    const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
    if (dias <= 0) return 'Hoy'
    if (dias === 1) return 'Ayer'
    if (dias < 30) return `Hace ${dias} días`
    const meses = Math.floor(dias / 30)
    return meses === 1 ? 'Hace un mes' : `Hace ${meses} meses`
  }
}
