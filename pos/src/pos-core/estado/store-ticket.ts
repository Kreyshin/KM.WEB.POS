import {
  calcularTotales,
  puedeTransicionar,
  totalesVacios,
  type EstadoTicket,
  type LineaTicket,
  type Ticket,
  type UnidadMedida,
} from '../modelo'

/**
 * Store del ticket en curso.
 *
 * TypeScript puro, sin framework: estas cinco operaciones son reglas de
 * negocio, no presentación. Se prueban sin navegador, las reutiliza cualquier
 * front de la suite, y `pos-core-ui` las envuelve en señales para Angular.
 *
 * El estado es inmutable hacia fuera: cada operación produce un ticket nuevo
 * y avisa a quien escuche. Nadie puede modificar una línea por referencia,
 * que es como se cuelan los totales que no cuadran con lo que se ve.
 */

/** Lo que hace falta para dar de alta una línea. Lo arma el perfil del rubro. */
export interface EntradaLinea<A = Record<string, unknown>> {
  productoId: string
  descripcion: string
  unidad: UnidadMedida
  factorAlmacen: number
  cantidad: number
  precioUnitario: number
  igvTasa: number
  icono?: string
  atributos: A
}

export interface OpcionesStore {
  sucursalId: string
  perfil: string
  /** Generador de UUID. Se inyecta para que el store no dependa del entorno. */
  nuevoId: () => string
}

/** Se avisa a quien escuche cada vez que el ticket cambia. */
export type EscuchaTicket = (ticket: Ticket) => void

/**
 * El ticket solo se modifica en borrador.
 *
 * Una vez enviado a cobro deja de ser del mostrador y pasa a ser de la caja:
 * si se pudiera seguir editando, el cajero cobraría un importe distinto del
 * que el vendedor le pasó.
 */
export class TicketNoEditable extends Error {
  constructor(estado: EstadoTicket) {
    super(`El ticket está en «${estado}» y ya no se puede modificar.`)
    this.name = 'TicketNoEditable'
  }
}

export class TransicionInvalida extends Error {
  constructor(desde: EstadoTicket, hacia: EstadoTicket) {
    super(`Un ticket «${desde}» no puede pasar a «${hacia}».`)
    this.name = 'TransicionInvalida'
  }
}

export class StoreTicket {
  private estado: Ticket
  private descuentoTicket = 0
  private readonly escuchas = new Set<EscuchaTicket>()

  constructor(private readonly opciones: OpcionesStore) {
    this.estado = this.ticketEnBlanco()
  }

  get ticket(): Ticket {
    return this.estado
  }

  /** Devuelve la función para dejar de escuchar. */
  suscribir(escucha: EscuchaTicket): () => void {
    this.escuchas.add(escucha)
    escucha(this.estado)
    return () => this.escuchas.delete(escucha)
  }

  // ── Las cinco operaciones ───────────────────────────────────────────────

  /**
   * Agrega una línea, o suma a la que ya existe.
   *
   * Dos lecturas del mismo producto, en la misma presentación y con los
   * mismos atributos, son la misma línea con cantidad 2. Un POS que crea dos
   * filas al escanear dos veces obliga al cajero a contar filas en vez de
   * leer cantidades, y en farmacia además partiría un mismo lote en dos.
   */
  agregarLinea<A extends Record<string, unknown>>(entrada: EntradaLinea<A>): LineaTicket {
    this.exigirEditable()
    if (entrada.cantidad <= 0) {
      throw new RangeError('La cantidad de una línea nueva tiene que ser mayor que cero.')
    }

    const existente = this.estado.lineas.find((linea) => this.esLaMisma(linea, entrada))
    if (existente) {
      const sumada = { ...existente, cantidad: existente.cantidad + entrada.cantidad }
      this.reemplazarLineas(
        this.estado.lineas.map((linea) => (linea.id === existente.id ? sumada : linea)),
      )
      return sumada
    }

    const nueva: LineaTicket = { id: this.opciones.nuevoId(), descuento: 0, ...entrada }
    this.reemplazarLineas([...this.estado.lineas, nueva])
    return nueva
  }

  /** Cambiar la cantidad a cero quita la línea: es lo que espera quien corrige. */
  cambiarCantidad(lineaId: string, cantidad: number): void {
    this.exigirEditable()
    if (cantidad <= 0) {
      this.quitarLinea(lineaId)
      return
    }
    this.reemplazarLineas(
      this.estado.lineas.map((linea) => (linea.id === lineaId ? { ...linea, cantidad } : linea)),
    )
  }

  quitarLinea(lineaId: string): void {
    this.exigirEditable()
    this.reemplazarLineas(this.estado.lineas.filter((linea) => linea.id !== lineaId))
  }

  /**
   * Descuento en importe, no en porcentaje.
   *
   * Sin `lineaId` se aplica al ticket entero. El importe se guarda tal cual y
   * es `calcularTotales` quien lo reparte entre las líneas, porque el reparto
   * depende de la tasa de IGV de cada una.
   */
  aplicarDescuento(importe: number, lineaId?: string): void {
    this.exigirEditable()
    const limpio = Math.max(0, importe)

    if (lineaId === undefined) {
      this.descuentoTicket = limpio
      this.reemplazarLineas(this.estado.lineas)
      return
    }

    this.reemplazarLineas(
      this.estado.lineas.map((linea) =>
        linea.id === lineaId ? { ...linea, descuento: limpio } : linea,
      ),
    )
  }

  /** Cierra el mostrador sobre este ticket y lo deja listo para la caja. */
  enviarACobro(): void {
    if (this.estado.lineas.length === 0) {
      throw new RangeError('No se puede enviar a cobro un ticket sin líneas.')
    }
    this.transicionar('por_cobrar')
  }

  // ── Resto del ciclo de vida ─────────────────────────────────────────────

  anular(): void {
    this.transicionar('anulado')
  }

  marcarCobrado(): void {
    this.transicionar('cobrado')
  }

  /** Empieza un ticket en blanco. El anterior ya debería estar resuelto. */
  nuevo(): void {
    this.descuentoTicket = 0
    this.estado = this.ticketEnBlanco()
    this.avisar()
  }

  /** Retoma un ticket existente, por ejemplo uno que estaba por cobrar. */
  cargar(ticket: Ticket): void {
    this.descuentoTicket = 0
    this.estado = ticket
    this.avisar()
  }

  // ── Interno ─────────────────────────────────────────────────────────────

  private ticketEnBlanco(): Ticket {
    return {
      id: this.opciones.nuevoId(),
      sucursalId: this.opciones.sucursalId,
      perfil: this.opciones.perfil,
      lineas: [],
      totales: totalesVacios,
      estado: 'borrador',
      creadoEn: new Date().toISOString(),
    }
  }

  /** Anota por qué se aparca el ticket. Lo lee la lista de por cobrar. */
  anotar(nota: string): void {
    this.exigirEditable()
    this.estado = { ...this.estado, nota: nota.trim() || undefined }
    this.avisar()
  }

  private esLaMisma(linea: LineaTicket, entrada: EntradaLinea): boolean {
    return (
      linea.productoId === entrada.productoId &&
      linea.unidad.codigo === entrada.unidad.codigo &&
      JSON.stringify(linea.atributos) === JSON.stringify(entrada.atributos)
    )
  }

  private exigirEditable(): void {
    if (this.estado.estado !== 'borrador') throw new TicketNoEditable(this.estado.estado)
  }

  private transicionar(hacia: EstadoTicket): void {
    if (!puedeTransicionar(this.estado.estado, hacia)) {
      throw new TransicionInvalida(this.estado.estado, hacia)
    }
    this.estado = { ...this.estado, estado: hacia }
    this.avisar()
  }

  private reemplazarLineas(lineas: LineaTicket[]): void {
    this.estado = {
      ...this.estado,
      lineas,
      totales: calcularTotales(lineas, this.descuentoTicket),
    }
    this.avisar()
  }

  private avisar(): void {
    for (const escucha of this.escuchas) escucha(this.estado)
  }
}
