/**
 * El contrato del perfil, aterrizado en Angular.
 *
 * Aquí es donde `TPantalla` deja de ser un hueco y pasa a ser un componente.
 * Es el único lugar del repo donde el contrato del perfil toca el framework:
 * si mañana la suite quisiera un POS en otro front, se reescribe este archivo
 * y `pos-core` queda intacto.
 */
import type { Type } from '@angular/core'
import type { CargadorPerfil, PerfilRubro } from '@pos-core/index'

export type PerfilRubroAngular<A = Record<string, unknown>> = PerfilRubro<A, Type<unknown>>

export type CargadorPerfilAngular = CargadorPerfil<Type<unknown>>
