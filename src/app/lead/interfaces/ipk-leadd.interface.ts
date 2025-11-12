import { Gender } from 'src/app/enums/common.enum';
import { LeadStageFilter, LeadStatus, ProductEnum } from '../enums/ipk-leadd.enum';

export interface ClientQaItem {
  question: string;
  answer: string;
}

export interface LeadPhoneSummary {
  id: string;
  label: string;
  number: string;
  normalized: string;
  isPrimary: boolean;
  isWhatsapp: boolean;
}

export interface IpkLeaddModel {
  id: string;
  leadCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone: string;
  phoneNormalized?: string | null;
  phones?: LeadPhoneSummary[];
  location?: string | null;
  gender?: Gender | null;
  age?: number | null;
  occupations?: Array<{
    profession: string;
    companyName?: string | null;
    designation?: string | null;
    startedAt?: Date | null;
    endedAt?: Date | null;
  }> | null;
  product?: ProductEnum | null;
  investmentRange?: string | null;
  sipAmount?: number | null;
  clientTypes?: string | null;
  referralCode?: string | null;
  referralName?: string | null;
  leadSource: string;
  remark?: unknown;
  bioText?: string | null;
  clientQa?: ClientQaItem[] | null;
  lastContactedAt?: Date | null;
  contactAttempts?: number | null;
  nextActionDueAt?: Date | null;
  assignedRmId?: string | null;
  assignedRM?: string | null;
  status: LeadStatus;
  clientStage?: LeadStageFilter;
  stageFilter?: string | null;
  approachAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
}
