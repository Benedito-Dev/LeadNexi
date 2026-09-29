import type { CookieOptions, Request, Response } from 'express';

/** Cookie do refresh token: httpOnly (script não lê) e só enviado para /api/auth. */
export const REFRESH_COOKIE = 'lnx_refresh';

const baseOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
});

export function setRefreshCookie(
  res: Response,
  token: string,
  expiresAt: Date,
) {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(), expires: expiresAt });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, baseOptions());
}

/** Lê o cookie direto do header (sem depender de cookie-parser). */
export function readRefreshCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === REFRESH_COOKIE) return decodeURIComponent(value.join('='));
  }
  return undefined;
}
