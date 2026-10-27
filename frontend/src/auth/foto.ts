/** Endereço da foto de perfil do usuário (pública, com cache longo: o ID muda a cada foto nova). */
export const fotoDoUsuario = (avatarId: string | null | undefined) => (avatarId ? `/api/auth/avatars/${avatarId}` : null)
