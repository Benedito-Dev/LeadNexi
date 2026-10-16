export class LeadListEntity {
  id: string;
  name: string;
  niche: string | null;
  city: string | null;
  targetContacts: number | null;
  archived: boolean;
  leadCount: number;
  createdAt: Date;
  updatedAt: Date;
}
