// Build da Vercel: empacota o backend já compilado (dist/main.js, com os metadados de decorators
// gerados pelo tsc) num arquivo único, com as dependências dentro. Na Vercel o dist/ vira a raiz da
// função e o node_modules fica numa subpasta, fora do alcance do Node; o bundle não precisa dele.
import { readFileSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

// O @nestjs/mapped-types (PartialType/OmitType dos DTOs de edição) carrega o class-validator com um
// `require` próprio, criado por createRequire: o esbuild não enxerga essas chamadas e elas procuram o
// node_modules na hora, que na Vercel não existe. Sem o class-validator os DTOs de edição ficam sem
// regras, o ValidationPipe (whitelist) apaga todos os campos e o PATCH responde 200 sem gravar nada.
// Tirando o createRequire, o `require` vira o comum e o esbuild põe o class-validator no bundle.
const requireDoMappedTypes = {
  name: 'require-do-mapped-types',
  setup(build) {
    build.onLoad({ filter: /@nestjs[\\/]mapped-types[\\/]dist[\\/]type-helpers\.utils\.js$/ }, ({ path }) => {
      const codigo = readFileSync(path, 'utf8');
      const linha = 'const require = createRequire(import.meta.url);';
      if (!codigo.includes(linha)) throw new Error('@nestjs/mapped-types mudou: revise o plugin require-do-mapped-types');
      return { contents: codigo.replace(linha, ''), loader: 'js' };
    });
  },
};

await build({
  entryPoints: ['dist/main.js'],
  outfile: 'dist/main.js',
  allowOverwrite: true,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: 'linked',
  plugins: [requireDoMappedTypes],
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
