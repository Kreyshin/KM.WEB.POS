import type { Routes } from '@angular/router'
import { exigeAnonimo, exigeRol, exigeSesion } from '@shell/guardas/sesion.guard'
import { ShellLayout } from '@shell/layout/shell.layout'

/**
 * Rutas del shell.
 *
 * Todo lo que no sea el acceso cuelga del layout y pasa por `exigeSesion`. Las
 * pantallas se cargan con `loadComponent` para que el paquete inicial sea solo
 * el shell y el acceso: en una caja que arranca cada mañana eso se nota.
 */
export const routes: Routes = [
  {
    path: 'acceso',
    canActivate: [exigeAnonimo],
    loadComponent: () => import('@shell/paginas/acceso.page').then((m) => m.AccesoPage),
  },
  {
    path: '',
    component: ShellLayout,
    canActivate: [exigeSesion],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'venta' },
      {
        path: 'venta',
        loadComponent: () => import('@shell/paginas/venta.page').then((m) => m.VentaPage),
      },
      {
        path: 'venta/por-cobrar',
        loadComponent: () => import('@shell/paginas/por-cobrar.page').then((m) => m.PorCobrarPage),
      },
      {
        path: 'caja',
        canActivate: [exigeRol('cajero', 'supervisor', 'administrador')],
        loadComponent: () => import('@shell/paginas/caja.page').then((m) => m.CajaPage),
      },
      {
        path: 'ajustes',
        loadComponent: () => import('@shell/paginas/ajustes.page').then((m) => m.AjustesPage),
      },
      {
        path: 'sin-permiso',
        loadComponent: () =>
          import('@shell/paginas/sin-permiso.page').then((m) => m.SinPermisoPage),
      },
      {
        path: '**',
        loadComponent: () =>
          import('@shell/paginas/no-encontrada.page').then((m) => m.NoEncontradaPage),
      },
    ],
  },
]
