import type { PhaseInput } from './types'

export const DEFAULT_PHASES: Array<Omit<PhaseInput, 'description'>> = [
  { name: 'Caixa de entrada', color: '#65a30d', is_final: false },
  { name: 'Fazendo', color: '#2563eb', is_final: false },
  { name: 'Concluído', color: '#16a34a', is_final: true },
]

/** Curated palette for phases and pipes: readable on white, distinct from each other. */
export const PALETTE = [
  '#65a30d', '#16a34a', '#0d9488', '#0891b2', '#2563eb', '#4f46e5',
  '#7c3aed', '#c026d3', '#db2777', '#e11d48', '#ea580c', '#d97706', '#475569',
]

export const PIPE_ICONS = ['stethoscope', 'clipboard', 'heart-pulse', 'file-check', 'briefcase', 'inbox', 'users', 'plane'] as const
