# `pos-core/estado`

Store del ticket en curso. Se llena en el **hito 2 (Núcleo del ticket)**.

Vive aquí, y no en `pos-core-ui`, porque las cinco operaciones que modifican el
ticket —`agregarLinea`, `cambiarCantidad`, `quitarLinea`, `aplicarDescuento` y
`enviarACobro`— son reglas, no presentación: se prueban sin navegador y las
reutiliza cualquier front de la suite.

La reactividad de Angular no entra: el store expondrá el estado y una
suscripción framework-agnóstica, y `pos-core-ui` lo envolverá en señales.
