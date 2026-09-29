// Progressão de cor do funil (BRAND.md, seção 4.2): a partir da 4ª etapa fica cyan.
const STAGE_COLOR = ['bg-stage-1', 'bg-stage-2', 'bg-stage-3', 'bg-stage-4'] as const

/** Classe de fundo da etapa pela posição dela no funil (0 = primeira). */
export function stageColorClass(index: number): string {
  return STAGE_COLOR[Math.min(Math.max(index, 0), STAGE_COLOR.length - 1)]
}
