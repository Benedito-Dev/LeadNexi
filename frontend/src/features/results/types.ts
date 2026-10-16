export interface ProspectingSettings {
  id?: number
  dailyTarget: number
  weeklyTarget: number
  monthlyRevenueGoal: number
  dailyLimit: number
  decisionContacts: number
  decisionMinReplies: number
}

export interface FunnelMetric {
  count: number
  rate: number | null
}

export interface FunnelPeriod {
  contacted: FunnelMetric
  responded: FunnelMetric
  meeting: FunnelMetric
  proposal: FunnelMetric
  won: FunnelMetric
}

export interface MessagePerformance {
  templateId: string
  variation: string
  contacts: number
  responses: number
  responseRate: number | null
}

export interface DecisionAlert {
  name: string
  contacts: number
  replies: number
  threshold: number
  minimumReplies: number
}

export interface ResultsDashboard {
  settings: ProspectingSettings
  weekly: FunnelPeriod
  monthly: FunnelPeriod
  streakDays: number
  averageFirstResponseHours: number | null
  messagePerformance: MessagePerformance[]
  decisionAlert: DecisionAlert | null
}
