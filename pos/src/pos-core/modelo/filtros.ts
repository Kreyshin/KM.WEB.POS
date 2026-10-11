/**
 * Filtros de catálogo: la lógica, no la pintura.
 *
 * Está aquí y no en la pantalla porque son reglas, y las reglas se prueban
 * sin navegador. La pantalla solo dibuja lo que estas funciones deciden.
 *
 * EL CAMBIO DE FONDO es que un filtro admite VARIOS valores. Antes era
 * `Record<string, string>` —un valor por faceta— y eso convertía cada
 * faceta en un botón de radio disfrazado de filtro: no se podía pedir
 * «Genfar o Portugal», ni «talla M y L», que es exactamente lo que pide
 * quien está delante del mostrador. Elegir el segundo valor borraba el
 * primero y parecía que el filtro no funcionaba.
 *
 * La semántica es la de cualquier buscador con facetas:
 *
 *   O dentro de una faceta    talla M o L
 *   Y entre facetas distintas (talla M o L) y color azul
 *
 * Es la única que no sorprende: dos valores de la misma faceta son
 * alternativas, dos facetas distintas son condiciones.
 */

/** Lo elegido, por clave de faceta. Vacío o ausente es «sin filtrar». */
export type FiltrosCatalogo = Readonly<Record<string, readonly string[]>>

/**
 * Pone o quita un valor. Un segundo toque en la misma opción la quita.
 *
 * Es un filtro, no un radio: el cajero que se pasa de clic tiene que poder
 * volver pulsando el mismo sitio, sin buscar una X.
 */
export function alternarFiltro(
  filtros: FiltrosCatalogo,
  clave: string,
  valor: string,
): FiltrosCatalogo {
  const actuales = filtros[clave] ?? []
  const siguientes = actuales.includes(valor)
    ? actuales.filter((otro) => otro !== valor)
    : [...actuales, valor]

  const copia: Record<string, readonly string[]> = { ...filtros }
  // Una clave con array vacío filtraría igual que no estar, pero contaría
  // como filtro activo y la pantalla enseñaría «1 filtro» sin nada puesto.
  if (siguientes.length === 0) delete copia[clave]
  else copia[clave] = siguientes
  return copia
}

/** Quita una faceta entera: la X de su grupo de pastillas. */
export function quitarFaceta(filtros: FiltrosCatalogo, clave: string): FiltrosCatalogo {
  const copia: Record<string, readonly string[]> = { ...filtros }
  delete copia[clave]
  return copia
}

export function filtroPuesto(filtros: FiltrosCatalogo, clave: string, valor: string): boolean {
  return (filtros[clave] ?? []).includes(valor)
}

/**
 * Cuántos filtros hay puestos: VALORES, no claves.
 *
 * «talla M, L» son dos filtros para quien los puso, aunque sean una sola
 * clave. Contar claves decía «1 filtro» con cuatro pastillas encendidas.
 */
export function cuantosFiltros(filtros: FiltrosCatalogo): number {
  return Object.values(filtros).reduce((suma, valores) => suma + valores.length, 0)
}

export function hayFiltros(filtros: FiltrosCatalogo): boolean {
  return cuantosFiltros(filtros) > 0
}

/** Una pastilla de las que se enseñan SIEMPRE, con lo justo para quitarla. */
export interface FiltroActivo {
  clave: string
  valor: string
  /** Cómo se llama el valor: «Genfar», «M». */
  etiqueta: string
  /** Cómo se llama la faceta: «Laboratorio», «Talla». */
  faceta: string
}

/**
 * Lo puesto ahora mismo, en orden de faceta, listo para pintar.
 *
 * Existe porque los filtros vivían DENTRO del panel plegable: se ponían
 * tres, se cerraba el panel y la pantalla enseñaba cuatro productos sin
 * decir por qué. Un filtro que no se ve es un filtro que el cajero no
 * sabe que tiene que quitar, y acaba diciendo que no hay stock.
 *
 * Toma las etiquetas de las facetas que publica el catálogo; un valor que
 * ya no figure en ellas se enseña crudo en vez de desaparecer, porque
 * sigue filtrando y tiene que poder quitarse.
 */
export function filtrosActivos(
  filtros: FiltrosCatalogo,
  facetas: readonly Faceta[],
): readonly FiltroActivo[] {
  const activos: FiltroActivo[] = []
  const porClave = new Map(facetas.map((faceta) => [faceta.clave, faceta]))

  for (const [clave, valores] of Object.entries(filtros)) {
    const faceta = porClave.get(clave)
    for (const valor of valores) {
      const opcion = faceta?.opciones.find((o) => o.valor === valor)
      activos.push({
        clave,
        valor,
        etiqueta: opcion?.etiqueta ?? valor,
        faceta: faceta?.etiqueta ?? clave,
      })
    }
  }
  return activos
}

/**
 * ¿Pasa este producto los filtros?
 *
 * Recibe una función que dice qué valores tiene el producto en una faceta
 * —varios, porque un producto puede ser de talla S y M a la vez— y aplica
 * O dentro y Y entre.
 */
export function cumpleFiltros(
  filtros: FiltrosCatalogo,
  valoresDe: (clave: string) => readonly string[],
): boolean {
  return Object.entries(filtros).every(([clave, elegidos]) => {
    if (elegidos.length === 0) return true
    const tiene = valoresDe(clave)
    return elegidos.some((valor) => tiene.includes(valor))
  })
}

// ── Facetas ───────────────────────────────────────────────────────────────

/**
 * Un filtro que el catálogo publica para que la pantalla lo dibuje.
 *
 * La pantalla pinta las facetas que reciba, con sus cuentas, sin conocer
 * ninguna. Es lo que permite tener filtros de verdad sin meter farmacia en
 * el shell.
 */
export interface Faceta {
  clave: string
  etiqueta: string
  opciones: readonly OpcionFaceta[]
  /**
   * Cómo se dibuja. El núcleo no decide estilo, pero sí la FORMA del dato:
   * un rango de precio son tramos excluyentes y se ven como tramos, no
   * como una lista de etiquetas sueltas.
   */
  forma?: 'pastillas' | 'tramos'
}

export interface OpcionFaceta {
  valor: string
  etiqueta: string
  /**
   * Cuántos productos quedarían si se pulsa esta opción, CON los demás
   * filtros ya puestos.
   *
   * No es el total del catálogo. Una cuenta que no mira los otros filtros
   * promete «Genfar 4» y al pulsar deja la pantalla vacía, y entonces el
   * número estorba más que ayudar.
   */
  cuantos: number
}

/**
 * Cuenta las opciones de una faceta contra la búsqueda ACTUAL, ignorando
 * lo que esté puesto en esa misma faceta.
 *
 * Ignorarla es lo que hace que las facetas sigan siendo usables: con
 * «Genfar» puesto, contar también por laboratorio daría cero en todos los
 * demás y no se podría añadir «Portugal» sin antes quitar Genfar.
 *
 * Las opciones que quedan en cero se devuelven igual, con su cero: la
 * pantalla las apaga. Esconderlas movería las pastillas de sitio a cada
 * clic y el ojo perdería la que iba a pulsar.
 */
export function contarFaceta<T>(
  universo: readonly T[],
  filtros: FiltrosCatalogo,
  clave: string,
  valoresDe: (producto: T, clave: string) => readonly string[],
  etiquetaDe: (valor: string) => string = (valor) => valor,
  /**
   * Cómo se ordenan las opciones.
   *
   *   true        alfabético: para laboratorios y marcas, donde da igual
   *   una lista   ese orden exacto: S, M, L, XL, o los tramos de precio de
   *               menor a mayor
   *
   * La lista hace falta porque sin ella el orden salía del orden de los
   * PRODUCTOS, y eso ponía «Más de S/ 900» antes de «Hasta S/ 150» y la L
   * antes de la M: el ojo baja por una tira de precios esperando que suba.
   */
  orden: boolean | readonly string[] = true,
): readonly OpcionFaceta[] {
  const otros = quitarFaceta(filtros, clave)
  const candidatos = universo.filter((producto) =>
    cumpleFiltros(otros, (otraClave) => valoresDe(producto, otraClave)),
  )

  const cuenta = new Map<string, number>()
  // El universo entero decide qué opciones EXISTEN; los candidatos, cuántas
  // hay. Si no, una opción en cero desaparecería y no se podría desmarcar.
  for (const producto of universo) {
    for (const valor of valoresDe(producto, clave)) {
      if (!cuenta.has(valor)) cuenta.set(valor, 0)
    }
  }
  for (const producto of candidatos) {
    for (const valor of valoresDe(producto, clave)) {
      cuenta.set(valor, (cuenta.get(valor) ?? 0) + 1)
    }
  }

  const opciones = [...cuenta.entries()].map(([valor, cuantos]) => ({
    valor,
    etiqueta: etiquetaDe(valor),
    cuantos,
  }))
  if (Array.isArray(orden)) {
    const posicion = new Map(orden.map((valor, indice) => [valor, indice]))
    // Un valor que no figure en el orden va al final, no desaparece: sigue
    // filtrando y tiene que poder desmarcarse.
    return opciones.sort(
      (a, b) =>
        (posicion.get(a.valor) ?? Number.MAX_SAFE_INTEGER) -
        (posicion.get(b.valor) ?? Number.MAX_SAFE_INTEGER),
    )
  }
  return orden ? opciones.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es')) : opciones
}

/** Un tramo de precio. `hasta` ausente es «y más». */
export interface TramoPrecio {
  valor: string
  etiqueta: string
  desde: number
  hasta?: number
}

/**
 * Tramos de precio tejidos desde los precios que hay.
 *
 * Genérico a propósito: no hay tramos fijos porque no existe un catálogo
 * típico. En una botica casi todo está bajo 50 soles y tramos de 500
 * dejarían una sola pastilla; en tecnología pasa lo contrario. Los cortes
 * salen de los CUARTILES del propio catálogo, redondeados a algo que un
 * cajero reconozca.
 *
 * Devuelve vacío con menos de cuatro precios distintos: tres tramos sobre
 * tres productos es un filtro que no filtra.
 */
export function tramosDePrecio(precios: readonly number[]): readonly TramoPrecio[] {
  const distintos = [...new Set(precios.filter((precio) => precio > 0))].sort((a, b) => a - b)
  if (distintos.length < 4) return []

  const cuartil = (parte: number) => distintos[Math.floor(distintos.length * parte)]
  const cortes = [...new Set([redondo(cuartil(0.33)), redondo(cuartil(0.66))])].filter(
    (corte) => corte > 0 && corte < distintos[distintos.length - 1],
  )
  if (cortes.length === 0) return []

  const tramos: TramoPrecio[] = []
  let desde = 0
  for (const corte of cortes) {
    tramos.push({
      valor: `${desde}-${corte}`,
      etiqueta: desde === 0 ? `Hasta ${entero(corte)}` : `${entero(desde)} – ${entero(corte)}`,
      desde,
      hasta: corte,
    })
    desde = corte
  }
  tramos.push({
    valor: `${desde}-`,
    etiqueta: `Más de ${entero(desde)}`,
    desde,
  })
  return tramos
}

/** El tramo al que cae un precio, o null si no cae en ninguno. */
export function tramoDe(precio: number, tramos: readonly TramoPrecio[]): TramoPrecio | null {
  return (
    tramos.find(
      (tramo) => precio > tramo.desde && (tramo.hasta === undefined || precio <= tramo.hasta),
    ) ??
    tramos.find((tramo) => tramo.desde === 0 && precio <= (tramo.hasta ?? Infinity)) ??
    null
  )
}

/** Redondea a una cifra que una persona reconoce: 5, 20, 50, 100, 500. */
function redondo(valor: number): number {
  if (valor <= 10) return Math.max(1, Math.round(valor))
  if (valor <= 100) return Math.round(valor / 5) * 5
  if (valor <= 1000) return Math.round(valor / 50) * 50
  return Math.round(valor / 500) * 500
}

function entero(valor: number): string {
  return `S/ ${valor.toLocaleString('es-PE')}`
}
