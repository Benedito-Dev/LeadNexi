export class AuthUserEntity {
  id: string;
  email: string;
  name: string;
}

export class LoginResponseEntity {
  /** JWT para enviar no header `Authorization: Bearer <token>` */
  accessToken: string;
  user: AuthUserEntity;
}
