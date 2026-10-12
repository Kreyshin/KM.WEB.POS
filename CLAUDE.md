# KM.WEB.POS — reglas de trabajo

Esto NO es documentación: es lo que me obliga. El README explica el
sistema; este archivo dice qué no se hace. Si algo de aquí choca con lo que
yo creía, gana esto.

## Idioma y rastro

- Todo en **español**: código, comentarios, mensajes de commit, nombres de
  variables y de clases CSS. El negocio es peruano y quien mantenga esto
  después no tiene por qué leer inglés.
- **Ningún rastro de que una IA participó en el desarrollo**: ni en
  commits, ni en comentarios, ni en el README, ni en ningún artefacto del
  repositorio.
- Los commits explican **por qué**, no qué. El diff ya dice qué.

## Rama

- Se desarrolla y se publica en `claude/intelligent-hypatia-j2kxhn`.
- Se publica también en `main` para disparar el despliegue de la demo.
- No se abre pull request salvo que se pida.

## Antes de dar algo por terminado

1. `npm run verify` en verde — formato, lint, tipos y pruebas.
2. Comprobado **en el navegador**, en los rubros que toque. Una prueba
   unitaria no demuestra que una pantalla se vea bien.
3. Despliegue confirmado por la API de Actions. La demo no se puede abrir
   desde aquí: el proxy bloquea `github.io`.

## Arquitectura: lo que no se rompe

- `pos-core` es TypeScript puro, sin Angular y sin `if` de rubro. Si hace
  falta una condición de farmacia, **falta un punto de extensión en el
  contrato**.
- Un perfil nunca importa a otro perfil ni a los adaptadores.
- El shell consume **puertos**, no adaptadores. Lo vigila ESLint
  (`import/no-restricted-paths`); si hace falta un método, se añade al
  puerto y se registra en `proveedores.ts`.
- El núcleo guarda `atributos` y no los interpreta.
- **Lo que es una regla baja a `pos-core` con sus pruebas.** Un número del
  negocio escrito en dos sitios ya no es una regla: son dos que hoy
  coinciden.
- El POS nunca es fuente de verdad de algo que custodia otro sistema.
- No se abstrae nada que no usen al menos dos perfiles.

## Dinero

- El IGV va **incluido** en el precio: se extrae del total, nunca se suma.
- Todo importe se redondea a céntimos con las funciones del núcleo. Nunca
  se recalcula a mano en una pantalla.
- Lo que la ley permite pero cambia —plazos, topes, políticas— va como
  **parámetro con valor por defecto**, no como constante en el código.

## Alcance

Antes de añadir algo, los tres filtros del README: ¿ocurre con el cliente
delante?, ¿es igual en todos los rubros?, ¿lo custodia otro sistema?

Casos ya resueltos que no se vuelven a discutir:

- El comprobante y la devolución **son del POS**.
- La identidad de los usuarios **es de Karma.Systems**; el turno es del POS.
- El stock real es del ERP; el POS anota el consumo.

## Al dudar

Ante una duda que afecte un contrato de `pos-core`, **preguntar antes de
decidir**. Un contrato mal puesto cuesta más que una pregunta.

## Color

- El verde está reservado para la vertical agrícola. No usarlo.
- La paleta sale del logotipo del POS, no de la plataforma.
