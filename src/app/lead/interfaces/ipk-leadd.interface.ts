import { Gender } from 'src/app/enums/common.enum';
import { ProductEnum, ProfessionEnum } from '../enums/ipk-leadd.enum';

export interface IpkLeaddModel {
  id: string;
  leadCode: string;
  location?: string;
  gender?: Gender;
  age?: number;
  profession?: ProfessionEnum;
  companyName?: string;
  designation?: string;
  product?: ProductEnum;
  investmentRange?: string;
  sipAmount?: number;
  clientTypes?: string;
  remark?: string;
  leadSource?: string;
  createdAt: Date;
  updatedAt: Date;
}
