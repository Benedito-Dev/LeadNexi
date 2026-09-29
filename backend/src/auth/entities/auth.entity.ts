export class AuthUserEntity {
  id: string;
  email: string;
  name: string;
}

export class LoginResponseEntity {
  /**
   * JWT curto (15 min) para o header `Authorization: Bearer <token>`.
   * O refresh token vai no cookie httpOnly `lnx_refresh` (renovação em POST /auth/refresh).
   */
  accessToken: string;
  user: AuthUserEntity;
}
