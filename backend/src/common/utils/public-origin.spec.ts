import type { Request } from 'express';
import { publicOrigin, stableOrigin } from './public-origin.js';

// Endereço público do servidor, visto de fora (atrás da Vercel ou do Vite)
describe('publicOrigin / stableOrigin', () => {
  const request = (headers: Record<string, string>) =>
    ({ protocol: 'http', headers }) as unknown as Request;

  afterEach(() => {
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  it('usa os cabeçalhos X-Forwarded-* (o primeiro valor) ou o Host', () => {
    expect(
      publicOrigin(
        request({
          host: 'interno:3000',
          'x-forwarded-host': 'leadnexi.vercel.app, outro',
          'x-forwarded-proto': 'https',
        }),
      ),
    ).toBe('https://leadnexi.vercel.app');
    expect(publicOrigin(request({ host: 'localhost:3000' }))).toBe(
      'http://localhost:3000',
    );
  });

  it('em produção na Vercel, fica sempre no domínio de produção', () => {
    const viaDeploy = request({
      'x-forwarded-host': 'leadnexi-abc123.vercel.app',
      'x-forwarded-proto': 'https',
    });
    expect(stableOrigin(viaDeploy)).toBe('https://leadnexi-abc123.vercel.app');

    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'leadnexi.vercel.app';
    process.env.VERCEL_ENV = 'preview';
    expect(stableOrigin(viaDeploy)).toBe('https://leadnexi-abc123.vercel.app');

    process.env.VERCEL_ENV = 'production';
    expect(stableOrigin(viaDeploy)).toBe('https://leadnexi.vercel.app');
  });
});
