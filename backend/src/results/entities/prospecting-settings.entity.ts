import { ApiProperty } from '@nestjs/swagger';

export class ProspectingSettingsEntity {
  id: number;
  dailyTarget: number;
  weeklyTarget: number;

  @ApiProperty({ type: Number, example: 300 })
  monthlyRevenueGoal: number;

  dailyLimit: number;
  decisionContacts: number;
  decisionMinReplies: number;
}
