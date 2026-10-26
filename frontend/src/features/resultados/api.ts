import { api } from '@/lib/api'
import type { Placar } from './tipos'

export const buscarPlacar = () => api<Placar>('/results')
