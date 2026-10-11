import type { Cliente, PuertoClientes } from '@pos-core/index'

/**
 * Clientes de ejemplo.
 *
 * La mezcla es a propósito: personas con DNI, que es la mayoría en una
 * botica, y dos con RUC —una clínica y una empresa— que son quienes piden
 * factura. Sin alguno con RUC no se puede probar el camino de la factura,
 * que es justo el que tiene reglas.
 */
const LLAVE = 'km.pos.clientes'

const semilla: Cliente[] = [
  {
    id: 'cli-1',
    tipoDocumento: 'DNI',
    documento: '45678912',
    nombre: 'Ana Herrera Ríos',
    telefono: '987 654 321',
    compras: 24,
    ultimaCompra: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
  {
    id: 'cli-2',
    tipoDocumento: 'DNI',
    documento: '09871234',
    nombre: 'Marco Salazar Pinto',
    telefono: '961 220 118',
    compras: 7,
    ultimaCompra: new Date(Date.now() - 19 * 86_400_000).toISOString(),
  },
  {
    id: 'cli-3',
    tipoDocumento: 'RUC',
    documento: '20512345678',
    nombre: 'Clínica San Pablo S.A.C.',
    direccion: 'Av. El Polo 789, Surco',
    compras: 41,
    ultimaCompra: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: 'cli-4',
    tipoDocumento: 'RUC',
    documento: '20600112233',
    nombre: 'Transportes Nazca E.I.R.L.',
    direccion: 'Jr. Lampa 240, Lima',
    compras: 3,
    ultimaCompra: new Date(Date.now() - 64 * 86_400_000).toISOString(),
  },
  {
    id: 'cli-5',
    tipoDocumento: 'CE',
    documento: '001234567',
    nombre: 'Lucía Ferreira Dos Santos',
    telefono: '930 441 902',
    compras: 2,
  },
]

function leer(): Cliente[] {
  try {
    const crudo = localStorage.getItem(LLAVE)
    return crudo ? (JSON.parse(crudo) as Cliente[]) : semilla
  } catch {
    return semilla
  }
}

function escribir(clientes: Cliente[]): void {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(clientes))
  } catch {
    // Sin respaldo se sigue atendiendo.
  }
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export class ClientesSimulados implements PuertoClientes {
  async buscar(texto: string): Promise<readonly Cliente[]> {
    const clientes = leer()
    const aguja = normalizar(texto)
    if (!aguja) return clientes
    // Por nombre y por documento: en el mostrador se dice tanto «Ana
    // Herrera» como el DNI de memoria.
    return clientes.filter(
      (cliente) => normalizar(cliente.nombre).includes(aguja) || cliente.documento.includes(aguja),
    )
  }

  async porDocumento(documento: string): Promise<Cliente | null> {
    return leer().find((cliente) => cliente.documento === documento.trim()) ?? null
  }

  async guardar(entrada: Omit<Cliente, 'id'> & { id?: string }): Promise<Cliente> {
    const clientes = leer()
    const indice = entrada.id ? clientes.findIndex((c) => c.id === entrada.id) : -1
    const cliente: Cliente = {
      ...entrada,
      id: entrada.id ?? `cli-${Date.now().toString(36)}`,
    }
    if (indice === -1) clientes.push(cliente)
    else clientes[indice] = cliente
    escribir(clientes)
    return cliente
  }
}
