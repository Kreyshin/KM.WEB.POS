import { Pipe, type PipeTransform } from '@angular/core'

/**
 * Importes en soles.
 *
 * Existe como pipe y no como `toFixed(2)` suelto para que el símbolo, los
 * decimales y el separador se decidan en un sitio. Un POS que escribe el
 * importe de tres maneras distintas es un POS en el que nadie confía.
 */
@Pipe({ name: 'moneda' })
export class MonedaPipe implements PipeTransform {
  transform(valor: number | null | undefined, conSimbolo = true): string {
    const cifra = (valor ?? 0).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return conSimbolo ? `S/ ${cifra}` : cifra
  }
}
