/**
 * Núcleo del POS: TypeScript puro, sin dependencias de framework.
 *
 * No importa UI, adaptadores, perfiles ni el shell; el lint lo verifica con
 * `import/no-restricted-paths` (ver eslint.config.js). Si aparece la necesidad
 * de un `if` por rubro aquí dentro, lo que falta es un punto de extensión en
 * el contrato del perfil, no la condición.
 */
export * from './modelo'
export * from './puertos'
export * from './perfil'
