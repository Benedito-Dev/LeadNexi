import { api } from '../../lib/api.ts'
import type { LoginInput, LoginResponse, User } from './types.ts'

export function login(input: LoginInput) {
  return api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getMe() {
  return api<User>('/auth/me')
}
