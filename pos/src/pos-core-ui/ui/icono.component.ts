import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

/**
 * Iconos de línea 24×24. Los mismos que KM.WEB.RESTAURANT y KM.WEB.TALLER.
 *
 * No son un juego nuevo: son los trazos de `KmIcono` y `KmBotonIcono` de
 * esas verticales, portados tal cual. Un sistema de la misma casa en el que
 * «eliminar» se dibuja distinto según la pantalla obliga a volver a
 * aprenderse la interfaz en cada módulo.
 *
 * Una sola familia: trazo 1.8, sin relleno, extremos redondeados, y el
 * color lo hereda de quien lo contiene. Eso último es lo que permite que el
 * mismo icono sirva en la barra oscura y sobre papel claro.
 */
export type NombreIcono =
  // Acciones
  | 'mas'
  | 'menos'
  | 'editar'
  | 'eliminar'
  | 'guardar'
  | 'cerrar'
  | 'buscar'
  | 'filtro'
  | 'descargar'
  | 'subirArchivo'
  | 'hoja'
  | 'plantilla'
  | 'ver'
  | 'anular'
  | 'separar'
  | 'subir'
  | 'bajar'
  // Datos
  | 'caja'
  | 'estante'
  | 'flecha'
  | 'lote'
  | 'serie'
  | 'calendario'
  | 'etiqueta'
  | 'dinero'
  | 'conteo'
  | 'impresora'
  | 'alerta'
  | 'check'
  | 'rechazo'
  | 'movimiento'

const TRAZOS: Record<NombreIcono, readonly string[]> = {
  mas: ['M12 5v14', 'M5 12h14'],
  menos: ['M5 12h14'],
  editar: ['M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z', 'M13.5 6.5l3 3'],
  eliminar: [
    'M4 7h16',
    'M10 11v6M14 11v6',
    'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12',
    'M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3',
  ],
  guardar: ['M5 4h11l3 3v13H5z', 'M8 4v5h7V4', 'M8 20v-6h8v6'],
  cerrar: ['M6 6l12 12M18 6L6 18'],
  buscar: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  filtro: ['M3 5h18', 'M7 12h10', 'M10 19h4'],
  descargar: ['M12 4v11', 'M8 11l4 4 4-4', 'M5 20h14'],
  /* Hoja de cálculo: la rejilla ES el icono. Una hoja con renglones sería
     un documento cualquiera; las celdas dicen «esto va en Excel». */
  hoja: ['M4 4h16v16H4z', 'M4 9h16M4 14.5h16', 'M9.5 4v16M15 4v16'],
  /* La misma rejilla con una flecha abajo: lo que se descarga para llenar. */
  plantilla: ['M4 3h16v13H4z', 'M4 7.5h16', 'M9.5 3v13M15 3v13', 'M12 18v4M9 19.5l3 2.5 3-2.5'],
  subirArchivo: ['M12 20V9', 'M8 13l4-4 4 4', 'M5 5h14'],
  ver: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  anular: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M5.6 5.6l12.8 12.8'],
  separar: [
    'M9 15l6-6',
    'M11 6l1.5-1.5a4 4 0 0 1 5.7 5.7L17 11.5',
    'M13 18l-1.5 1.5a4 4 0 0 1-5.7-5.7L7 12.5',
  ],
  subir: ['M18 15l-6-6-6 6'],
  bajar: ['M6 9l6 6 6-6'],
  caja: ['M3 8l9-5 9 5v8l-9 5-9-5V8z', 'M3 8l9 5 9-5', 'M12 13v8'],
  estante: ['M4 3v18M20 3v18', 'M4 9h16M4 15h16', 'M7 6h4M13 12h4M7 18h5'],
  flecha: ['M4 12h15', 'M14 6l6 6-6 6'],
  lote: ['M4 7h16v10H4z', 'M8 7v10M11 7v10M13 7v10M16 7v10'],
  serie: ['M4 6v12', 'M7 6v12', 'M11 6v12', 'M13 6v12', 'M17 6v12', 'M20 6v12'],
  calendario: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4M16 3v4'],
  etiqueta: ['M3 12V4h8l9 9-8 8-9-9z', 'M7.5 7.5h.01'],
  dinero: ['M3 6h18v12H3z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M6 9v.01M18 15v.01'],
  conteo: ['M9 4h6v3H9z', 'M7 5H5v16h14V5h-2', 'M8 12l2 2 4-4', 'M8 17h8'],
  impresora: ['M7 9V3h10v6', 'M7 17H4v-8h16v8h-3', 'M7 14h10v7H7z'],
  alerta: ['M12 3l10 18H2L12 3z', 'M12 10v4', 'M12 17.5v.5'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  rechazo: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M9 9l6 6M15 9l-6 6'],
  movimiento: ['M7 4v16M7 4 3 8M7 4l4 4', 'M17 20V4M17 20l-4-4M17 20l4-4'],
}

/** La misma escala que en las hermanas, para que un icono mida igual en toda la suite. */
const TAMANOS = { xs: 14, sm: 16, md: 20, lg: 24 } as const

@Component({
  selector: 'km-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg
      [attr.width]="px()"
      [attr.height]="px()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @for (d of trazos(); track d) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
})
export class IconoComponent {
  readonly nombre = input.required<NombreIcono>()
  readonly tamano = input<keyof typeof TAMANOS>('sm')

  protected readonly px = computed(() => TAMANOS[this.tamano()])
  protected readonly trazos = computed(() => TRAZOS[this.nombre()])
}
