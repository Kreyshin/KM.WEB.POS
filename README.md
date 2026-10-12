# KM.WEB.POS

Aplicación de venta de mostrador de la suite Karma Systems: un solo shell que
carga un perfil de rubro y delega el cobro, el stock y los comprobantes a otras
piezas.

El objetivo de diseño es que **agregar un rubro nuevo sea crear una librería
más, sin tocar el núcleo**.

- **Demo y portada:** https://kreyshin.github.io/KM.WEB.POS/
- **Stack:** Angular 20 (componentes standalone, señales, carga diferida por
  rutas), Tailwind 4, Vitest.

## Alcance: qué entra aquí y qué no

Esta es la norma que mantiene el POS pequeño, y existe para poder decir que
no. Un punto de venta que crece sin línea acaba siendo un ERP malo con una
pantalla de cobro.

Pequeño no es incompleto. El comprobante y la devolución están DENTRO
aunque suenen a contabilidad: ocurren con el cliente delante, y eso manda
sobre a qué se parecen.

**Lo único que el POS tiene que saber:** quién atiende, qué se lleva el
cliente, cuánto es, cómo paga, qué papel se entrega y qué hay en la gaveta al
cerrar. Todo lo demás lo pide por un puerto.

### La prueba de los tres filtros

Ante cualquier función nueva, en este orden:

1. **¿Ocurre con el cliente delante?** Si no, no es del POS. Un informe
   mensual, una orden de compra o un cuadre contable se miran sentado, y eso
   es backoffice.
2. **¿Es igual en todos los rubros?** Si cambia por rubro, va en un perfil o
   en el microservicio del vertical, no en el núcleo.
3. **¿Lo custodia otro sistema?** El stock real, el correlativo oficial y la
   identidad de los usuarios tienen un dueño. El POS los consulta; no los
   inventa ni los guarda como fuente de verdad.

### Dónde vive cada cosa

| Va en **KM.WEB.POS**                                    | Va en el **ERP**                                   | Va en el **MS del vertical**                          | Va en **otro producto**                |
| ------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| Shell: sesión, sucursal y carga del perfil activo       | Inventario de verdad: kardex, almacenes, traslados | Validar la regla del rubro contra el registro oficial | Mesas, comandas y cocina → RESTAURANT  |
| `pos-core`: ticket, totales, caja y contrato del perfil | Compras, proveedores, órdenes                      | Precios por lista, promociones y convenios            | Reservas y habitaciones → HOTEL        |
| Perfiles de rubro: farmacia, ropa, tecnología           | Contabilidad y el envío real a SUNAT               | Numeración oficial de comprobantes                    | Órdenes de trabajo → TALLER            |
| Puertos hacia el back, simulados mientras no exista     | Planillas, asistencia, usuarios corporativos       | Fidelización y puntos                                 | Cobro y arqueo compartidos → LIB.CAJA  |
| Lo que se toca de pie, en el mostrador                  | Lo que se mira sentado, al cierre del mes          | Lo que cambia por rubro del lado servidor             | Lo que es la operación de otro negocio |

### Autenticación: no vive aquí

La identidad de los usuarios es de **Karma.Systems**, que es el núcleo de la
suite y la autenticación de TODOS los sistemas. El POS no guarda contraseñas
ni decide quién es quién: consume. Lo que sí es suyo es el turno —quién está
en el puesto ahora mismo— porque eso es operación de mostrador y no identidad.

### Dudas que ya se resolvieron así

| Pregunta                                      | Respuesta                                                       |
| --------------------------------------------- | --------------------------------------------------------------- |
| ¿El POS descuenta stock?                      | Anota el consumo; quien lleva la cuenta es el ERP               |
| ¿El POS numera la boleta?                     | Pide el correlativo; quien lo custodia es el microservicio      |
| ¿El POS valida una receta contra el registro? | Avisa en pantalla; quien valida de verdad es el MS del vertical |
| ¿El POS calcula el punto de reposición?       | Lo enseña; quien lo calcula es el ERP, que sabe la rotación     |
| ¿El POS da de alta un usuario?                | No. Karma.Systems                                               |

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
- Lo que es una REGLA baja a `pos-core` con sus pruebas. Si un número del
  negocio está escrito en dos sitios, ya no es una regla: son dos que hoy
  coinciden.
- El POS nunca es la fuente de verdad de algo que custodia otro sistema. Lo
  consulta, lo enseña y lo vuelve a pedir.

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

1. La navegación es una barra estrecha y callada, con el nombre bajo cada
   icono.
2. La columna del ticket no se pliega y no comparte el scroll: el total está
   siempre en pantalla por largo que sea el ticket.
3. Todo lo frecuente tiene tecla y la enseña (`/` buscar, flechas recorrer,
   Entrar agregar, Espacio ficha, Alt+C cobrar). No son teclas de función:
   el navegador se queda con casi todas antes de que lleguen a la página.

### El color

**Violeta azulado sobre acero.** Sale del logotipo del propio POS —la
impresora de comprobantes en acero, el violeta del papel que sale, el
índigo profundo de la ranura— y no de la plataforma.

Es violeta como la plataforma, pero ni el mismo violeta ni repartido igual.

El **tono** difiere: la plataforma es `#8a2be2`, un violeta que tira a rojo
y que declaran igual hotel, restaurante y taller; el del logotipo del POS es
`#7c4df0`, que tira a azul.

El **reparto** es lo que de verdad separa. En las hermanas el morado viste
el cromo —navegación, cabeceras, fondo—. Aquí el cromo es acero e índigo, de
lo que está hecha la impresora del logotipo, y el violeta se retira a una
sola cosa: el dinero. El total y «Cobrar» son lo único violeta de la
pantalla, igual que en el logotipo lo único violeta es el comprobante que
sale.

Eso importa porque **el POS se vende suelto**. No todo el que lo compra
compra la plataforma, y un producto que solo se explica como «el módulo
morado de otra cosa» no tiene nada que enseñar cuando se presenta solo.

Lo que se comparte con la suite no es el tono, es el sistema: la misma
geometría, el mismo movimiento (`--km-mov-*`), la misma postura táctil y la
misma forma de nombrar. Dos productos de la misma casa se reconocen por cómo
se comportan antes que por el color.

El verde queda reservado para la vertical agrícola.

Lo propio de esta vertical es **dónde** se reparte. Las hermanas visten el
cromo; aquí el bronce se retira de la navegación y se concentra en el dinero:

| Zona               | Color                                                |
| ------------------ | ---------------------------------------------------- |
| Navegación         | índigo en **ambos** temas: es el cromo, no el acento |
| Zona de venta      | superficie limpia, sin lavados                       |
| Columna del ticket | tinta azul en **ambos** temas: es el ancla           |
| Total y «Cobrar»   | latón, y son lo único de marca en pantalla           |

El violeta nunca viste el cromo. Si lo hiciera, el POS volvería a parecer
una pantalla más de la plataforma, que es justo lo que no es.

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
| 7 · Perfil ropa       | Matriz de talla y color, pantalla de venta propia                 | **Listo**    |
| 8 · Enlace ERP        | `ModoIntegracion` y `VinculoErp` de D-009                         | Pendiente    |
| 9 · Devoluciones      | Nota de crédito, baja del comprobante y política de la empresa    | **Listo**    |
| 10 · Back real        | `KARMA.MS.POS` y los adaptadores HTTP                             | Pendiente    |

\* El cobro y la caja funcionan, pero **dentro de este repo**, no en
`KARMA.LIB.CAJA`. Lo que sí está hecho es **congelar el contrato** (ver
abajo): los dos verticales ya nombran igual las mismas cosas, que es lo que
hacía falta antes de extraer nada.

### El contrato de caja (D-012), congelado

`KM.WEB.RESTAURANT` tenía caja antes y en producción. Este POS empezó la
suya por su cuenta, y para cuando alguien miró ya divergían en cuatro
sitios. Divergir aquí no es un detalle de nombres: `KARMA.LIB.CAJA` sale de
este contrato, y dos verticales que llaman distinto a lo mismo son dos
librerías.

Cuando hay dos nombres para lo mismo gana el que ya está cobrando dinero de
verdad, así que el POS adopta los del restaurante:

| Concepto             | Antes en el POS        | Congelado                  |
| -------------------- | ---------------------- | -------------------------- |
| Fondo de apertura    | `montoInicial`         | `fondoInicial`             |
| Conteo de cierre     | `conteoFinal: number`  | `conteo: ConteoMedio[]`    |
| Diferencia del turno | se recalculaba al leer | `diferencia`, **guardada** |
| Cierre ciego         | fijo, siempre          | `PoliticaCaja.cierreCiego` |
| Explicación          | no existía             | `nota`                     |

El cambio con consecuencias es el segundo. El POS contaba **solo el
efectivo**: eso detecta el cajón descuadrado, que es el descuadre que ya se
nota. Lo que no detectaba era el total de tarjeta que no cuadra con el
voucher del POS bancario, ni el de Yape contra el extracto, y ese no lo ve
nadie hasta fin de mes porque nadie lo está contando.

El cierre ciego ahora destapa lo esperado **fila por fila**, no de golpe:
teclear el efectivo revelaba lo esperado en todos los demás medios, y
entonces el ciego solo protegía al primero que se contara.

Lo que el POS **no** adopta, y por qué:

| Del restaurante | Aquí            | Por qué                                                 |
| --------------- | --------------- | ------------------------------------------------------- |
| `localId`       | `sucursalId`    | Es el nombre en todo el POS y en el resto de la suite   |
| ventas → arqueo | `movimientos[]` | El POS no tiene tabla de ventas; lleva su propio diario |
| `propinas`      | —               | No hay propina en un mostrador                          |

El arqueo es una función pura del núcleo (`arquear`), no un método del
adaptador: tiene que dar el mismo número aquí, en el restaurante y en la
librería que salga de los dos.

### Deuda conocida

| Qué                                        | Por qué importa                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `KARMA.LIB.CAJA` no existe como paquete    | El contrato ya está congelado; falta extraerlo                                                             |
| Caja sin permisos ni bitácora              | El restaurante exige `caja.gestionar` y audita; aquí nadie firma el arqueo                                 |
| El punto de reposición es un número fijo   | 20 unidades vale en una botica y no en una tienda de televisores; debería ser por producto y salir del ERP |
| `ModoIntegracion` / `VinculoErp` sin traer | El enganche con el ERP se resuelve con campos sueltos                                                      |
