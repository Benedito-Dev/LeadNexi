/** Conteúdo do JWT */
export interface JwtPayload {
  sub: string;
  email: string;
}

/** Usuário anexado à request pelo JwtAuthGuard */
export interface AuthenticatedUser {
  id: string;
  email: string;
}
