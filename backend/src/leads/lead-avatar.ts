/** Onde fica a foto de perfil do lead no armazenamento (o ID muda a cada foto nova) */
export function avatarKey(avatarId: string) {
  return `leads/avatars/${avatarId}.jpg`;
}

/** A foto do lead é conferida de novo (pode ter mudado no Instagram) depois disso */
export const AVATAR_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
