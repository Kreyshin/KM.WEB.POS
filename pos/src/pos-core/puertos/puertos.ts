/**
 * Puertos hacia el exterior.
 *
 * `pos-core` solo conoce estas interfaces; quién responde se decide al arrancar
 * la aplicación. Eso permite construir todo el front antes de que exista
 * KARMA.MS.POS, y es además el borrador del contrato que ese microservicio
 * tendrá que cumplir.
 *
 * Regla que no se rompe: toda llamada al back pasa por un puerto. Ningún
 * componente usa HTTP directamente.
 */
import type {
  CategoriaRef,
  Cliente,
  Cobro,
  ConsultaCatalogo,
  ContextoPrecio,
  CuentaPorCobrar,
  Faceta,
  FilaHoja,
  MedioPago,
  MovimientoCaja,
  ProductoRef,
  ResultadoCobro,
  SesionCaja,
  Ticket,
} from '../modelo'

export interface PuertoCatalogo {
  buscar(consulta: ConsultaCatalogo): Promise<ProductoRef[]>
  /**
   * Las categorías del catálogo, con cuántos productos tiene cada una.
   *
   * Están en el puerto y no importadas del adaptador porque la pantalla de
   * venta las pinta: traerlas del módulo simulado dejaba la caja enseñando
   * las categorías de la demo el día que entre el back de verdad.
   */
  categorias(sucursalId: string): Promise<readonly GrupoCategoria[]>
  /** Los filtros avanzados que el catálogo publica. */
  facetas(sucursalId: string): Promise<readonly Faceta[]>
}

export interface GrupoCategoria {
  categoria: CategoriaRef
  cuantos: number
}

export interface PuertoPrecios {
  precioDe(productoId: string, contexto: ContextoPrecio): Promise<number>
}

export interface PuertoStock {
  disponible(productoId: string, atributos?: unknown): Promise<number>
}

export interface PuertoTickets {
  guardar(ticket: Ticket): Promise<void>
  enviarACobro(ticketId: string): Promise<void>
  porCobrar(sucursalId: string): Promise<Ticket[]>
  /**
   * Lo saca de la lista de espera: se cobró, se anuló o se retomó.
   *
   * No borra la venta, que vive en el ticket: solo deja de estar pendiente.
   * Sin esto, un ticket retomado seguiría ofreciéndose a otra caja y se
   * cobraría dos veces.
   */
  quitar(ticketId: string): Promise<void>
}

/**
 * El hueco que llenará KARMA.LIB.CAJA.
 *
 * Mientras no exista, detrás hay un diálogo simulado que marca el ticket como
 * cobrado. Después estará el componente `km-panel-cobro` del paquete
 * `@karmacorp/caja-angular`. El POS nunca registra pagos por su cuenta.
 */
export interface PuertoCobro {
  cajaAbierta(): Promise<boolean>
  cobrar(cuenta: CuentaPorCobrar): Promise<ResultadoCobro>
}

/**
 * La sesión de caja del turno.
 *
 * Separado de `PuertoCobro` a propósito: cobrar es del ticket y abrir caja
 * es del turno. Un POS puede venderse sin control de caja —hay bodegas que
 * no lo quieren— y entonces este puerto simplemente no se registra.
 */
export interface PuertoCaja {
  /** La sesión abierta de este puesto, o null si nadie abrió caja. */
  actual(sucursalId: string, usuarioId: string): Promise<SesionCaja | null>
  abrir(
    sucursalId: string,
    usuario: { id: string; nombre: string },
    monto: number,
  ): Promise<SesionCaja>
  registrar(sesionId: string, movimiento: Omit<MovimientoCaja, 'id' | 'en'>): Promise<SesionCaja>
  cerrar(sesionId: string, contado: number): Promise<SesionCaja>
}

/**
 * Los medios de pago que acepta este puesto.
 *
 * Es un puerto y no una constante porque la lista la decide el negocio y
 * cambia por país: en Perú entran Yape y Plin, en otro sitio no existen.
 */
export interface PuertoMediosPago {
  disponibles(sucursalId: string): Promise<readonly MedioPago[]>
}

/**
 * Registro del cobro de un ticket.
 *
 * Esto es lo que hoy hace el diálogo simulado y mañana hará KARMA.LIB.CAJA
 * detrás de `PuertoCobro`. Se declara aparte para que el día del cambio solo
 * se sustituya el adaptador y las pantallas no se enteren.
 */
export interface PuertoPagos {
  registrar(ticketId: string, cobro: Cobro): Promise<ResultadoCobro>
}

/** Clientes del puesto. Lo mínimo para emitir y reconocer al habitual. */
export interface PuertoClientes {
  buscar(texto: string): Promise<readonly Cliente[]>
  porDocumento(documento: string): Promise<Cliente | null>
  guardar(cliente: Omit<Cliente, 'id'> & { id?: string }): Promise<Cliente>
}

/**
 * Alta y edición del catálogo.
 *
 * Puerto APARTE del de lectura, y no dos métodos más en `PuertoCatalogo`.
 * Cuando el negocio contrata el módulo de almacén del ERP, el catálogo
 * pasa a ser suyo y el POS deja de poder escribirlo: ese día este puerto
 * sencillamente no se registra, la pantalla esconde los botones de alta y
 * todo lo demás sigue igual. Con los métodos metidos en `PuertoCatalogo`
 * habría que dejarlos lanzando errores, que es peor.
 */
export interface PuertoMantenimientoCatalogo {
  guardar(producto: ProductoRef): Promise<ProductoRef>
  eliminar(productoId: string): Promise<void>
  /** Ajusta las existencias sin pasar por el formulario completo. */
  ajustarStock(productoId: string, unidades: number): Promise<void>
}

/**
 * Lectura y escritura de hojas de cálculo para el catálogo.
 *
 * Puerto y no una importación directa: el shell no puede depender de qué
 * librería lee el .xlsx, y mañana la misma pantalla servirá para un CSV o
 * para un pegado desde el portapapeles sin tocarse.
 */
export interface PuertoHojaCatalogo {
  plantilla(): Promise<Blob>
  leer(archivo: File): Promise<readonly FilaHoja[]>
}

/**
 * Los turnos que el acceso ofrece para marcar sin teclear el usuario.
 *
 * Puerto aparte y OPCIONAL: en la demo los pone el adaptador simulado, y
 * en producción los dará el puesto —quién abrió turno hoy en esta caja—.
 * Sin él, el acceso pide usuario y clave, que es lo que debe pasar cuando
 * nadie publica una lista.
 */
export interface PuertoTurnos {
  delPuesto(sucursalId: string): Promise<readonly TurnoSugerido[]>
}

export interface TurnoSugerido {
  /** El `usuario` con el que se inicia sesión, no el id interno. */
  usuario: string
  nombre: string
}
