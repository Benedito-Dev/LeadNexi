import type { Request } from 'express';

/**
 * Endereço público deste servidor, como o navegador o vê (ex.: "https://leadnexi.vercel.app").
 * Atrás de proxy (Vercel, Vite em dev) vem dos cabeçalhos X-Forwarded-*. Usado para montar o
 * endereço de retorno do login do Instagram; um cabeçalho forjado só gera um endereço que a Meta
 * recusa (ele precisa ser igual ao cadastrado no app).
 */
export function publicOrigin(request: Request): string {
  const proto =
    firstValue(request.headers['x-forwarded-proto']) ?? request.protocol;
  const host =
    firstValue(request.headers['x-forwarded-host']) ?? request.headers.host;
  return `${proto}://${host}`;
}

function firstValue(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header;
  return value?.split(',')[0]?.trim() || undefined;
}
