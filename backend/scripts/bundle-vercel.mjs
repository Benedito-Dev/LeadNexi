// Build da Vercel: empacota o backend já compilado (dist/main.js, com os metadados de decorators
// gerados pelo tsc) num arquivo único, com as dependências dentro. Na Vercel o dist/ vira a raiz da
// função e o node_modules fica numa subpasta, fora do alcance do Node; o bundle não precisa dele.
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';

await build({
  entryPoints: ['dist/main.js'],
  outfile: 'dist/main.js',
  allowOverwrite: true,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: 'linked',
  // Pacotes que o NestJS/pg carregam só se instalados (require dentro de try): ficam de fora
  external: [
    '@nestjs/microservices',
    '@nestjs/websockets',
    '@nestjs/platform-socket.io',
    '@nestjs/platform-fastify',
    '@fastify/static',
    'class-transformer/storage',
    'pg-native',
  ],
  // `require` para as dependências CommonJS dentro de um bundle ESM
  banner: {
    js: "import { createRequire as __vercelCreateRequire } from 'node:module'; const require = __vercelCreateRequire(import.meta.url);",
  },
  logLevel: 'warning',
});

// A função sobe só com o dist/: marca o bundle como ES module
writeFileSync('dist/package.json', JSON.stringify({ type: 'module' }));

console.log('✔ dist/main.js empacotado para a Vercel');
