import { columnasPlantilla, type FilaHoja, type PuertoHojaCatalogo } from '@pos-core/index'

/**
 * Lectura y escritura de .xlsx.
 *
 * Es lo ÚNICO que sabe de Excel en todo el proyecto. El análisis de las
 * filas vive en el núcleo y recibe pares columna/valor, así que el día que
 * la carga venga de un CSV o de un pegado desde el portapapeles solo hace
 * falta otro archivo como este.
 *
 * `exceljs` se importa de forma dinámica, no arriba: pesa cerca de un mega
 * y la pantalla de venta no puede pagarlo. Así entra solo cuando alguien
 * abre la carga masiva, que es una vez al instalar y poco más.
 */

/**
 * Encabezado de hoja a clave de columna.
 *
 * Sin tildes, en minúsculas y con guion bajo. Y SIN el asterisco: la
 * plantilla marca las obligatorias con «codigo *», así que sin quitarlo el
 * lector no reconocería su propia plantilla. Lo mismo con los dos puntos y
 * los paréntesis, que es lo que se añade al retocar una cabecera a mano.
 */
function normalizarEncabezado(texto: string): string {
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[*:()]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
}

/** Una celda puede venir como número, fecha, fórmula o texto enriquecido. */
function celdaATexto(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'string') return valor.trim()
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor)
  if (valor instanceof Date) return valor.toISOString()
  if (typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>
    // Fórmula: interesa el resultado, no la fórmula.
    if ('result' in objeto) return celdaATexto(objeto['result'])
    if ('text' in objeto) return celdaATexto(objeto['text'])
    if ('richText' in objeto && Array.isArray(objeto['richText'])) {
      return (objeto['richText'] as { text?: string }[]).map((t) => t.text ?? '').join('')
    }
    if ('hyperlink' in objeto) return celdaATexto(objeto['text'])
  }
  return String(valor).trim()
}

/**
 * Lee la primera hoja del libro y devuelve filas por columna.
 *
 * La primera hoja y no una con un nombre fijo: la gente renombra las
 * pestañas, y exigir «Productos» rechazaría plantillas por un detalle que
 * no cambia los datos.
 */
export async function leerLibro(archivo: File | ArrayBuffer): Promise<FilaHoja[]> {
  const { Workbook } = await import('exceljs')
  const libro = new Workbook()
  const datos = archivo instanceof ArrayBuffer ? archivo : await archivo.arrayBuffer()
  await libro.xlsx.load(datos)

  const hoja = libro.worksheets[0]
  if (!hoja) throw new Error('El archivo no tiene ninguna hoja.')

  const encabezados: string[] = []
  hoja.getRow(1).eachCell({ includeEmpty: true }, (celda, columna) => {
    encabezados[columna] = normalizarEncabezado(celdaATexto(celda.value))
  })

  if (!encabezados.some((cabecera) => cabecera === 'codigo')) {
    throw new Error('La hoja no tiene la columna «codigo». Descarga la plantilla y parte de ella.')
  }

  const filas: FilaHoja[] = []
  hoja.eachRow({ includeEmpty: false }, (fila, numero) => {
    if (numero === 1) return
    const registro: Record<string, string> = {}
    fila.eachCell({ includeEmpty: true }, (celda, columna) => {
      const clave = encabezados[columna]
      if (clave) registro[clave] = celdaATexto(celda.value)
    })
    filas.push(registro)
  })

  return filas
}

/**
 * Genera la plantilla de carga.
 *
 * Tres hojas, y el reparto importa:
 *
 *   PRODUCTOS va VACÍA, solo con los encabezados. Es la primera y la única
 *   que se lee. Con ejemplos dentro, quien no los borre los importa como
 *   productos reales —y en una plantilla con una advertencia en rojo
 *   siempre hay quien no los borra—. Una hoja vacía no puede equivocarse.
 *
 *   EJEMPLO tiene las mismas columnas ya rellenas, con un producto
 *   fraccionado de tres formas de venta. Imitar es más rápido que leer, y
 *   aquí no estorba porque no se lee.
 *
 *   INSTRUCCIONES explica cada columna, porque quien rellena el catálogo
 *   rara vez es quien configuró el sistema.
 *
 * Las obligatorias van marcadas en el encabezado para que el error se vea
 * antes de subir el archivo y no después.
 */
export async function generarPlantilla(): Promise<Blob> {
  const { Workbook } = await import('exceljs')
  const libro = new Workbook()
  libro.creator = 'Karma Novum · Punto de venta'
  libro.created = new Date()

  const encabezar = (nombre: string) => {
    const hoja = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] })
    hoja.columns = columnasPlantilla.map((columna) => ({
      header: columna.obligatoria ? `${columna.titulo} *` : columna.titulo,
      key: columna.clave,
      width: Math.max(columna.titulo.length + 6, Math.min(columna.ejemplo.length + 4, 42)),
    }))
    const encabezado = hoja.getRow(1)
    encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A46E8' } }
    encabezado.alignment = { vertical: 'middle' }
    encabezado.height = 24
    return hoja
  }

  // La primera hoja es la que se lee, y va vacía a propósito.
  encabezar('Productos')
  const muestra = encabezar('Ejemplo')

  // Un producto fraccionado de tres presentaciones: es el caso que se
  // copia mal cuando no está de ejemplo.
  const ejemplos: Record<string, string>[] = [
    {
      codigo: 'PAR500',
      descripcion: 'Paracetamol 500 mg',
      codigo_barras: '7750001000017',
      categoria: 'Analgésicos',
      icono: 'tableta',
      unidad_almacen: 'TAB',
      stock: '420',
      venta_unidad: 'TAB',
      equivale_a: '1',
      precio: '0.50',
      exonerado: 'no',
      suelta: 'si',
      ficha: 'Principio activo: Paracetamol | Laboratorio: Genfar',
    },
    {
      codigo: 'PAR500',
      descripcion: '',
      codigo_barras: '',
      categoria: '',
      icono: '',
      unidad_almacen: 'TAB',
      stock: '',
      venta_unidad: 'BLI',
      equivale_a: '10',
      precio: '4.50',
      exonerado: 'no',
      suelta: 'no',
      ficha: '',
    },
    {
      codigo: 'MET850',
      descripcion: 'Metformina 850 mg',
      codigo_barras: '7750001000048',
      categoria: 'Crónicos',
      icono: 'tableta',
      unidad_almacen: 'TAB',
      stock: '240',
      venta_unidad: 'TAB',
      equivale_a: '1',
      precio: '0.40',
      exonerado: 'si',
      suelta: 'si',
      ficha: 'Principio activo: Metformina | Laboratorio: Hersil',
    },
  ]

  for (const ejemplo of ejemplos) {
    muestra.addRow(ejemplo)
  }

  muestra.addRow({})
  const aviso = muestra.addRow({
    codigo: 'Copia el formato de arriba en la hoja «Productos». Esta hoja no se importa.',
  })
  aviso.font = { bold: true, color: { argb: 'FFB45309' } }

  // Instrucciones aparte: quien rellena el catálogo rara vez es quien
  // configuró el sistema, y una columna mal entendida son 500 filas mal.
  const guia = libro.addWorksheet('Instrucciones')
  guia.columns = [
    { header: 'Columna', key: 'columna', width: 20 },
    { header: '¿Obligatoria?', key: 'obligatoria', width: 14 },
    { header: 'Qué poner', key: 'ayuda', width: 72 },
    { header: 'Ejemplo', key: 'ejemplo', width: 42 },
  ]
  const cabeceraGuia = guia.getRow(1)
  cabeceraGuia.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  cabeceraGuia.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A46E8' } }
  cabeceraGuia.height = 22

  for (const columna of columnasPlantilla) {
    guia.addRow({
      columna: columna.titulo,
      obligatoria: columna.obligatoria ? 'Sí' : 'No',
      ayuda: columna.ayuda,
      ejemplo: columna.ejemplo,
    })
  }

  guia.addRow({})
  guia.addRow({
    columna: 'Dónde escribir',
    ayuda:
      'En la hoja «Productos», que viene vacía. La hoja «Ejemplo» es solo para mirar: ' +
      'no se importa. Al subir el archivo se lee únicamente la primera hoja.',
  })
  guia.addRow({
    columna: 'Varias formas de venta',
    ayuda:
      'Repite el mismo «codigo» en varias filas. Cada fila es una forma de vender: ' +
      'tableta suelta, blíster de 10, caja de 100. La descripción y las existencias ' +
      'se leen de la primera.',
  })
  guia.addRow({
    columna: 'Precios',
    ayuda:
      'Siempre CON el IGV incluido, que es el precio de la etiqueta. El sistema extrae ' +
      'el impuesto del total; nunca lo suma.',
  })
  guia.getColumn('ayuda').alignment = { wrapText: true, vertical: 'top' }

  const buffer = await libro.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * El puerto, implementado.
 *
 * Carga `exceljs` solo al usarse: pesa cerca de un mega y la pantalla de
 * venta no puede pagarlo. Las dos funciones de arriba ya lo importan de
 * forma dinámica, así que esta clase no añade peso al arrancar.
 */
export class HojaCatalogoExcel implements PuertoHojaCatalogo {
  async plantilla(): Promise<Blob> {
    return generarPlantilla()
  }

  async leer(archivo: File): Promise<readonly FilaHoja[]> {
    return leerLibro(archivo)
  }
}
