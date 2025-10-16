import { Gender } from 'src/app/enums/common.enum';
import {
  ClientStage,
  LeadStatus,
  ProductEnum,
  ProfessionEnum,
} from '../enums/ipk-leadd.enum';

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
  profession?: ProfessionEnum | null;
  companyName?: string | null;
  designation?: string | null;
  product?: ProductEnum | null;
  investmentRange?: string | null;
  sipAmount?: number | null;
  clientTypes?: string | null;
  referralCode?: string | null;
  leadSource: string;
  remark?: string | null;
  bioText?: string | null;
  clientQa?: ClientQaItem[] | null;
  assignedRmId?: string | null;
  assignedRM?: string | null;
  status: LeadStatus;
  clientStage?: ClientStage | null;
  approachAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
}
