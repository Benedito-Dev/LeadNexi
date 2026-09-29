export interface Lead {
  id: string
  name: string
  phone: string | null
  email: string | null
  source: string | null
  estimatedValue: string | null
  notes: string | null
  position: number
  stageId: string
  createdAt: string
  updatedAt: string
}
