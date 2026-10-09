# KM.WEB.POS

Aplicación de venta de mostrador de la suite Karma Systems: un solo shell que
carga un perfil de rubro y delega el cobro, el stock y los comprobantes a otras
piezas.

El objetivo de diseño es que **agregar un rubro nuevo sea crear una librería
más, sin tocar el núcleo**.

- **Demo y portada:** https://kreyshin.github.io/KM.WEB.POS/
- **Stack:** Angular 20 (componentes standalone, señales, carga diferida por
  rutas), Tailwind 4, Vitest.

## Alcance

| Le corresponde a este repo                                   | No le corresponde                                                           |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Shell: sesión, sucursal y carga del perfil activo            | Panel de cobro y sesión de caja: van en `KARMA.LIB.CAJA`                    |
| `pos-core`: ticket, contrato del perfil y pedidos por cobrar | Reglas de rubro del lado servidor: van en el microservicio de cada vertical |
| Perfiles de rubro: ropa y farmacia en la primera etapa       | Inventario, facturación y contabilidad: son del ERP                         |
| Puertos hacia el back, con simulaciones mientras no exista   | Pantallas de gestión de un vertical, como la recepción del hotel            |

## Empezar

```bash
cd pos
npm install
npm run dev       # http://localhost:4200
```

El acceso es un pad numérico: se elige el turno y se marca el PIN (`1111` a
`4444` en la demo). Debajo, plegado, hay entrada por **usuario y clave**
(`rquispe`, `ltirado`, `emori`, `admin`; clave `demo`).

No hay campo de correo en ninguna parte, y no debe haberlo: en un mostrador el
cajero no tiene cuenta de correo de la empresa, y escribir una dirección con el
cliente esperando es fricción sin contrapartida.

Los turnos de ejemplo viven en un componente aparte que se monta con `@defer`,
así que quedan en su propio trozo: cuando `KM_DEMO` es falso no se descargan.

| Comando              | Qué hace                                                 |
| -------------------- | -------------------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo                                   |
| `npm run verify`     | Formato, lint, tipos y pruebas: lo mismo que corre el CI |
| `npm run build`      | Paquete de producción                                    |
| `npm run build:demo` | Paquete de la demo publicada en Pages                    |
| `npm run test`       | Pruebas con Vitest                                       |
| `npm run lint`       | ESLint, incluidas las fronteras entre librerías          |

## Estructura

Un shell delgado y todo lo demás en librerías; los perfiles dependen del núcleo
y nunca al revés.

```
pos/src/
├── pos-core/           TypeScript PURO, sin framework
│   ├── modelo/         Ticket, LineaTicket, CuentaPorCobrar
│   ├── puertos/        Interfaces hacia el back y hacia el cobro
│   ├── perfil/         Contrato PerfilRubro
│   └── estado/         Store del ticket en curso (hito 2)
├── pos-core-ui/        La capa Angular del núcleo
│   ├── perfil/         PerfilRubroAngular: aquí la pantalla pasa a ser Type<unknown>
│   ├── puertos/        Tokens de inyección de los puertos
│   └── ui/             Carrito, totales, zona de cobro (hito 2)
├── pos-adaptadores/
│   ├── simulado/       Implementaciones en memoria
│   └── http/           Implementaciones reales (hito 6)
├── perfil-ropa/        (hito 3)
├── perfil-farmacia/    (hito 4)
├── shell/              Layout, sesión, tema, guardas, registro de perfiles
└── app/                Rutas y arranque
```

`pos-core` es TypeScript puro a propósito: el modelo del ticket y los puertos no
importan nada de Angular, así que los reutiliza cualquier front de la suite y un
cambio de framework no los alcanza. Solo `pos-core-ui` toca el framework.

### Reglas de dependencia

| Librería          | Puede importar                         | No puede importar                |
| ----------------- | -------------------------------------- | -------------------------------- |
| `pos-core`        | Nada del repo                          | UI, adaptadores, perfiles, shell |
| `pos-core-ui`     | `pos-core`                             | Adaptadores, perfiles, shell     |
| `pos-adaptadores` | `pos-core`                             | UI, perfiles, shell              |
| `perfil-*`        | `pos-core`, `pos-core-ui`              | Otro perfil, adaptadores, shell  |
| `shell`           | Todo menos un perfil de forma estática | Un perfil con `import` estático  |

No son una convención escrita en un documento: están en `pos/eslint.config.js`
y **el lint falla** si alguien las rompe. Para comprobarlo:

```bash
cd pos
printf "import '@perfil-ropa'\nexport {}\n" > src/pos-core/_prueba.ts
npx eslint src/pos-core/_prueba.ts    # 2 errores
rm src/pos-core/_prueba.ts
```

Los perfiles se cargan solo con `import()` diferido, desde
`src/shell/perfiles/registro.ts`, que es el único archivo exento de esa regla.

## Reglas que no se rompen

- `pos-core` no contiene ninguna condición por rubro. Si hace falta un `if` de
  farmacia, falta un punto de extensión en el contrato.
- Un perfil nunca importa a otro perfil ni a los adaptadores.
- El núcleo guarda `atributos` y no lo interpreta; solo lo leen el perfil y el
  microservicio del vertical.
- Toda llamada al back pasa por un puerto. Ningún componente usa HTTP
  directamente.
- El cobro siempre pasa por `PuertoCobro`; el POS no registra pagos por su
  cuenta.
- No se abstrae nada que no usen al menos dos perfiles.

## Diseño

El POS **no comparte la estructura** de las otras verticales. Hospedaje,
Restaurante y Taller llevan barra de módulos + menú de secciones + área de
trabajo. Este lleva otra cosa:

```
┌──────────────────────────────────────────────┬─────────────┐
│ barra fina 44px: sucursal · destinos · caja  │             │
├──────────────────────────────────────────────┤   TICKET    │
│                                              │  (carbón,   │
│  ZONA DE VENTA                               │   380px,    │
│  buscador + pantalla del perfil de rubro     │   fija)     │
│                                              │   TOTAL     │
│                                              │  [ COBRAR ] │
└──────────────────────────────────────────────┴─────────────┘
```

El motivo: el cajero no navega. Pasa la jornada en una pantalla, con las manos
en el teclado y el escáner, y lo que necesita ver sin buscarlo es el ticket y
el total. Dedicarle 92px permanentes a una barra de módulos que se usa cuatro
veces al día, y esconder el total, es diseñar un backoffice y llamarlo POS.

De ahí salen tres reglas:

1. La navegación es una barra de 44px, neutra y callada.
2. La columna del ticket no se pliega y no comparte el scroll: el total está
   siempre en pantalla por largo que sea el ticket.
3. Todo lo frecuente tiene tecla y la enseña (F1 mostrador, F2 buscar,
   F3 por cobrar, F4 caja, F6 cliente, F9 ajustes, F12 cobrar).

### El color

**Bronce sobre carbón tabaco**, un oro apagado y de baja saturación, no un
ámbar de aviso. Hospedaje lleva turquesa y azul, Taller azul marino y carmín,
Restaurante el naranja del fuego, y la plataforma el violeta; el verde queda
reservado.

Lo propio de esta vertical es **dónde** se reparte. Las hermanas visten el
cromo; aquí el bronce se retira de la navegación y se concentra en el dinero:

| Zona               | Color                                     |
| ------------------ | ----------------------------------------- |
| Navegación         | neutra, sin color de marca                |
| Zona de venta      | superficie limpia, sin lavados            |
| Columna del ticket | carbón en **ambos** temas: es el ancla    |
| Total y «Cobrar»   | bronce, y son lo único bronce en pantalla |

La regla operativa: **si algo se pinta de bronce y no es el total ni el botón
de cobrar, está mal.** Un POS en el que el botón de cobrar compite con la
barra de menús es un POS que hace perder ventas.

Los demás rasgos:

1. **Tema oscuro por defecto.** La caja está en interior y la pantalla queda
   encendida toda la jornada. El claro existe y se recuerda, pero hay que
   pedirlo. El atributo `data-theme` se fija en `index.html`, antes del primer
   pintado, para que no haya destello.
2. **Geometría intermedia:** radios 10/16/22 px, y 44 px de alto mínimo en todo
   control, porque el mostrador se opera con el dedo.
3. **Cifras tabulares** en todo importe, y 40 px en el total: tiene que leerse
   de pie, a un metro, con el cliente mirando.

Los tokens están en `pos/src/assets/main.css`. La identidad de plataforma se
conserva íntegra en `pos/src/assets/karma/karma-identidad.css` y en el isotipo
de `pos/src/shell/marca/karma-logo.component.ts`, que sigue apareciendo como
atribución («Un sistema Karma Systems»).

## Mapa de la suite

```
KM.WEB.POS ──(ticket y pedidos)──────────► KARMA.MS.POS
KM.WEB.POS ──(cobro)──► KARMA.LIB.CAJA ──► KARMA.MS.POS
KM.WEB.HOTEL ─(cobro)─► KARMA.LIB.CAJA ──► KARMA.MS.POS

KARMA.MS.POS ──► Microservicios de verticales   (receta, precios por mayor)
KARMA.MS.POS ──► ERP                            (inventario, SUNAT, contabilidad)
```

Este repo le habla directo al back para el ticket y pasa por la librería solo
para cobrar. `KM.WEB.HOTEL` cobra con la misma librería; por eso el cobro no
vive aquí.

## Plan por hitos

| Hito                  | Deja listo                                                                | Estado    |
| --------------------- | ------------------------------------------------------------------------- | --------- |
| 1 · Esqueleto         | Workspace, shell, sesión, tema, librerías y reglas de dependencia activas | **Listo** |
| 2 · Núcleo del ticket | Modelo, store y carrito con adaptadores simulados                         | Pendiente |
| 3 · Perfil ropa       | Buscador, matriz de talla y color, registro diferido                      | Pendiente |
| 4 · Perfil farmacia   | Buscador por principio activo, lote y receta                              | Pendiente |
| 5 · Cobro             | `KARMA.LIB.CAJA` conectada a `PuertoCobro`                                | Pendiente |
| 6 · Back real         | `KARMA.MS.POS` y los adaptadores HTTP                                     | Pendiente |

El hito 4 es la prueba del diseño: es el momento barato para descubrir que al
contrato del perfil le falta algo.
