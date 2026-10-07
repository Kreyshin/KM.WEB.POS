import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import angular from 'angular-eslint'
import importPlugin from 'eslint-plugin-import'

/**
 * Reglas de frontera entre librerías.
 *
 * Son el contrato de arquitectura del repo, escrito donde el CI lo verifica:
 * `pos-core` no conoce a nadie, los perfiles no se conocen entre sí, y el
 * shell carga los perfiles solo con `import()` diferido.
 *
 * Cada zona se declara como "a este destino no puede llegar nada desde este
 * origen". Se lee al revés de lo intuitivo porque `from` es quien importa.
 */
const zonas = [
  // pos-core es el núcleo puro: no importa nada del repo, ni siquiera su UI.
  {
    target: './src/pos-core',
    from: [
      './src/pos-core-ui',
      './src/pos-adaptadores',
      './src/perfil-ropa',
      './src/perfil-farmacia',
      './src/shell',
    ],
    message:
      'pos-core es el núcleo puro: no puede importar UI, adaptadores, perfiles ni el shell. Si hace falta, falta un punto de extensión en el contrato.',
  },
  // La UI del núcleo solo depende del núcleo.
  {
    target: './src/pos-core-ui',
    from: ['./src/pos-adaptadores', './src/perfil-ropa', './src/perfil-farmacia', './src/shell'],
    message: 'pos-core-ui solo puede importar pos-core.',
  },
  // Los adaptadores implementan los puertos del núcleo y nada más.
  {
    target: './src/pos-adaptadores',
    from: ['./src/perfil-ropa', './src/perfil-farmacia', './src/shell', './src/pos-core-ui'],
    message: 'pos-adaptadores solo puede importar pos-core.',
  },
  // Un perfil no conoce a otro perfil, ni a los adaptadores, ni al shell.
  {
    target: './src/perfil-ropa',
    from: ['./src/perfil-farmacia', './src/pos-adaptadores', './src/shell'],
    message:
      'Un perfil solo puede importar pos-core y pos-core-ui: nunca otro perfil, los adaptadores ni el shell.',
  },
  {
    target: './src/perfil-farmacia',
    from: ['./src/perfil-ropa', './src/pos-adaptadores', './src/shell'],
    message:
      'Un perfil solo puede importar pos-core y pos-core-ui: nunca otro perfil, los adaptadores ni el shell.',
  },
]

export default tseslint.config(
  {
    ignores: ['dist/', 'dist-demo/', 'out-tsc/', 'coverage/', '.angular/', 'node_modules/'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'import/no-restricted-paths': ['error', { zones: zonas }],

      // El shell nunca importa un perfil de forma estática: se cargan con
      // import() diferido para que cada rubro viaje en su propio trozo.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@perfil-ropa',
                '@perfil-farmacia',
                '**/perfil-ropa/**',
                '**/perfil-farmacia/**',
              ],
              message:
                'Los perfiles se cargan con import() diferido desde el registro del shell, nunca con un import estático.',
            },
          ],
        },
      ],

      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'km', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'km', style: 'kebab-case' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // El registro de perfiles es el único lugar donde se los nombra.
    files: ['src/shell/perfiles/registro.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
)
