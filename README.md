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

El acceso es un pad numérico: se elige el turno y se marca su PIN. La otra vía
es **usuario y clave**, y se conmuta con ella, no se despliega debajo.

La pantalla **no enseña las credenciales**: un login que publica las claves
junto al nombre enseña a operar mal y queda impresentable delante de un
cliente. Las de la demo son:

| Turno       | Rol           | PIN    | Usuario   |
| ----------- | ------------- | ------ | --------- |
| Rosa Quispe | Cajero        | `1111` | `rquispe` |
| Luis Tirado | Vendedor      | `2222` | `ltirado` |
| Elena Mori  | Supervisor    | `3333` | `emori`   |
| Karma Admin | Administrador | `4444` | `admin`   |

La clave de todos es `demo`.

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
│   ├── modelo/         Ticket, línea, unidades, totales con IGV
│   ├── puertos/        Interfaces hacia el back y hacia el cobro
│   ├── perfil/         Contrato PerfilRubro
│   └── estado/         Store del ticket: las cinco operaciones
├── pos-core-ui/        La capa Angular del núcleo
│   ├── perfil/         PerfilRubroAngular: aquí la pantalla pasa a ser Type<unknown>
│   ├── puertos/        Tokens de inyección de los puertos
│   ├── estado/         El store envuelto en señales
│   └── ui/             Carrito y formato de moneda
├── pos-adaptadores/
│   ├── simulado/       Implementaciones en memoria
│   └── http/           Implementaciones reales (hito 6)
│   └── hoja/           Lectura y plantilla .xlsx del catálogo
├── perfil-ropa/        Matriz de talla y color, pantalla de venta propia
├── perfil-tecnologia/  Serie e IMEI por ejemplar, sin pantalla propia
├── perfil-farmacia/    Marcas, reglas y atributos de botica
├── shell/              Layout, sesión, tema, guardas, pantallas comunes
│   ├── perfiles/       Registro con import() diferido y PerfilService
│   ├── paginas/        Mostrador, por cobrar, caja, catálogo, clientes…
│   ├── cobro/          Panel de cobro y recibo (sustituto de KARMA.LIB.CAJA)
│   └── acceso/         Entrada al puesto
└── app/                Rutas y arranque
```

### Las cuatro capas, de un vistazo

```
   ┌──────────────────────────────────────────────────────────┐
   │  shell          Sesión · navegación · pantallas comunes  │
   │                 Es el ÚNICO que cablea puertos ←→ adaptadores
   └───────┬──────────────────────┬───────────────────┬───────┘
           │ usa                  │ carga con import()│ registra
           ▼                      ▼                   ▼
   ┌───────────────┐      ┌───────────────┐   ┌────────────────┐
   │ pos-core-ui   │      │  perfil-*     │   │ pos-adaptadores│
   │ Angular:      │      │ farmacia, ropa│   │ simulado · http│
   │ señales,      │◄─────┤ marcas,       │   │ hoja (.xlsx)   │
   │ pipes, carrito│      │ reglas, pantalla  └───────┬────────┘
   └───────┬───────┘      └───────┬───────┘           │ implementa
           │                      │                   │
           └──────────┬───────────┴───────────────────┘
                      ▼
            ┌─────────────────────────────────────┐
            │  pos-core   TypeScript PURO         │
            │  modelo · puertos · contrato perfil │
            │  store del ticket · sin framework   │
            └─────────────────────────────────────┘
```

Las flechas van en un solo sentido: **todo apunta al núcleo y el núcleo no
apunta a nada**. El lint lo comprueba.

`pos-core` es TypeScript puro a propósito: el modelo del ticket y los puertos no
importan nada de Angular, así que los reutiliza cualquier front de la suite y un
cambio de framework no los alcanza. Solo `pos-core-ui` toca el framework.

### Reglas de dependencia

| Librería          | Puede importar                     | No puede importar                    |
| ----------------- | ---------------------------------- | ------------------------------------ |
| `pos-core`        | Nada del repo                      | UI, adaptadores, perfiles, shell     |
| `pos-core-ui`     | `pos-core`                         | Adaptadores, perfiles, shell         |
| `pos-adaptadores` | `pos-core`                         | UI, perfiles, shell                  |
| `perfil-*`        | `pos-core`, `pos-core-ui`          | Otro perfil, adaptadores, shell      |
| `shell`           | `pos-core`, `pos-core-ui`, puertos | **Adaptadores** y perfiles estáticos |

Las dos excepciones del shell están aisladas en un archivo cada una:
`shell/proveedores.ts` es el único sitio que puede nombrar un adaptador, y
`shell/perfiles/registro.ts` el único que puede nombrar un perfil.

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

## Unidades de medida

Un producto se compra, se guarda y se vende en unidades distintas: una botica
compra una caja de 100 blísteres, la guarda por blíster y vende la tableta
suelta.

La unidad vive en el **núcleo**, no en `atributos`. `atributos` es para lo que
el núcleo debe guardar sin entender; la unidad tiene que entenderla, porque de
ella dependen el total que se cobra y las unidades que se descuentan del stock.
Y no es de un rubro: una ferretería vende por metro y por rollo, una bodega por
caja y por unidad. La ropa, donde las tres coinciden, es la excepción.

El mostrador solo usa dos de las tres: la de **venta**, en la que se cobra, y la
de **almacén**, en la que se descuenta. La de compra es del módulo de almacén
del ERP, que es quien recibe la mercadería.

## Totales: el IGV va incluido, no se suma

En el comercio minorista peruano el precio de la etiqueta ya incluye el IGV: lo
que el cliente ve es lo que paga. Así que el impuesto **se extrae del total**,
no se añade:

```
bruto − descuento = total
total = valorVenta + igv
```

No vale `subtotal + impuesto = total`. Esa fórmula habría cobrado un 18 % de
más. Cada línea lleva su propia tasa, porque hay medicamentos exonerados
—oncológicos, diabetes, VIH— y una boleta que los grave está mal emitida.

El descuento de ticket se reparte entre las líneas en proporción a su importe,
y no se resta al final en bloque: con tasas distintas por línea, restarlo en
bloque desglosa mal el impuesto.

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

Cómo se engancha este repo con los demás verticales y con el ERP.

```
  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐
  │ KM.WEB.POS  │  │ KM.WEB.HOTEL │  │ KM.WEB.       │  │ KM.WEB.      │
  │  mostrador  │  │  recepción   │  │  RESTAURANT   │  │  TALLER.AUTO │
  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  └──────┬───────┘
         │                │                  │                 │
         │  ticket,       │                  │                 │
         │  catálogo      └────────┬─────────┴─────────────────┘
         │                         │ cobro
         │                ┌────────▼─────────┐
         ├───────────────►│  KARMA.LIB.CAJA  │  medios de pago · pago mixto
         │     cobro      │   (compartida)   │  vuelto · sesión · arqueo
         │                └────────┬─────────┘
         ▼                         ▼
  ┌──────────────────────────────────────────┐
  │              KARMA.MS.POS                │
  └───────┬──────────────────────────┬───────┘
          │                          │
  ┌───────▼────────────┐   ┌─────────▼───────────────────────────┐
  │ MS de cada vertical│   │                ERP                  │
  │ receta, mayoreo,   │   │ inventario · SUNAT · contabilidad   │
  │ lote y vencimiento │   │ compras · precios · asistencia      │
  └────────────────────┘   └─────────────────────────────────────┘
```

Este repo le habla directo al back para el ticket y pasa por la librería solo
para cobrar. El hotel cobra con la misma: por eso el cobro no vive aquí.

### El enganche con el ERP no es un interruptor

No es «conectado o no». Es **por capacidad y por modo**, con la decisión
tomada por capacidad, por empresa y por local:

```
capacidad   inventario · compras · precios · ventas · contabilidad · asistencia

modo        autonomo      la vertical registra y decide
            sincronizado  registra y homologa; en conflicto manda el ERP
            delegado      opera el ERP; la vertical solo lee

VinculoErp  { entidad, idVertical, idExterno, estado, version }
```

Una botica sin ERP va en `inventario: autonomo` y el stock del POS es la
verdad. El día que contrata el módulo de almacén pasa a `sincronizado`, y
entonces la verdad es la del ERP. La pantalla no cambia: cambia el modo.

> **Estado:** este contrato está decidido y escrito en `KM.WEB.RESTAURANT`
> (decisión D-009). Este repo todavía NO lo implementa: lo resuelve con
> campos opcionales (`ProductoRef.stock?`) y notas en el código. Adoptarlo
> tal cual, sin reinventarlo, es trabajo pendiente.

## Plan por hitos

| Hito                  | Deja listo                                                        | Estado       |
| --------------------- | ----------------------------------------------------------------- | ------------ |
| 1 · Esqueleto         | Workspace, shell, sesión, tema, librerías y reglas de dependencia | **Listo**    |
| 2 · Núcleo del ticket | Modelo, store, carrito y totales con IGV incluido                 | **Listo**    |
| 3 · Mostrador         | Rejilla, filtros por facetas, ficha de producto y fraccionamiento | **Listo**    |
| 4 · Perfil farmacia   | Marcas, reglas y atributos del rubro, cargados en diferido        | **Listo**    |
| 5 · Cobro y caja      | Pago mixto, vuelto, comprobante, sesión de caja y arqueo          | **Listo** \* |
| 6 · Gestión           | Por cobrar, catálogo con alta y carga masiva, clientes, reportes  | **Listo**    |
| 7 · Perfil ropa       | Matriz de talla y color, pantalla de venta propia                 | Pendiente    |
| 8 · Enlace ERP        | `ModoIntegracion` y `VinculoErp` de D-009                         | Pendiente    |
| 9 · Back real         | `KARMA.MS.POS` y los adaptadores HTTP                             | Pendiente    |

\* El cobro y la caja funcionan, pero **dentro de este repo**, no en
`KARMA.LIB.CAJA`. `KM.WEB.RESTAURANT` tiene su propia implementación, con
otros nombres para las mismas cosas. Hay dos modelos de lo mismo y la
librería compartida sigue sin existir: decidir si se extrae o si cada
vertical se queda con la suya es lo que desbloquea este punto.

### Deuda conocida

| Qué                                        | Por qué importa                                       |
| ------------------------------------------ | ----------------------------------------------------- |
| `KARMA.LIB.CAJA` no existe                 | Dos implementaciones del mismo cobro, ya divergiendo  |
| `ModoIntegracion` / `VinculoErp` sin traer | El enganche con el ERP se resuelve con campos sueltos |
