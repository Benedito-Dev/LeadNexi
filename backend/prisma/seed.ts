/**
 * Seed idempotente: cria/atualiza o usuário do sistema e, se ainda não
 * existir nenhum pipeline, cria o funil padrão.
 *
 * Uso: npx prisma db seed
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/auth/password.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEFAULT_STAGES = [
  { name: 'Novo', color: '#64748B' },
  { name: 'Contato', color: '#3B82F6' },
  { name: 'Proposta', color: '#F59E0B' },
  { name: 'Fechado', color: '#22C55E' },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável ${name} não definida no .env`);
  return value;
}

async function main() {
  const email = requireEnv('SEED_USER_EMAIL').toLowerCase();
  const name = requireEnv('SEED_USER_NAME');
  const passwordHash = await hashPassword(requireEnv('SEED_USER_PASSWORD'));

  await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash },
    update: { name, passwordHash },
  });
  console.log(`✔ Usuário ${email} pronto`);

  if ((await prisma.pipeline.count()) === 0) {
    await prisma.pipeline.create({
      data: {
        name: 'Vendas',
        position: 0,
        stages: {
          create: DEFAULT_STAGES.map((stage, position) => ({
            ...stage,
            position,
          })),
        },
      },
    });
    console.log('✔ Pipeline padrão "Vendas" criado');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
