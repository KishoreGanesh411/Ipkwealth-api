import { registerEnumType } from '@nestjs/graphql';
import {
  ProfessionEnum,
  ProductEnum,
  LeadStatus,
  ClientStage,
  PhoneLabel,
  LeadEventType,
} from '../lead/enums/ipk-leadd.enum';
import { Gender } from './common.enum';
import { UserRoles, Status } from '../user/enums/user.enums';

registerEnumType(Gender, { name: 'Gender' });
registerEnumType(ProfessionEnum, { name: 'ProfessionEnum' });
registerEnumType(ProductEnum, { name: 'ProductEnum' });
registerEnumType(UserRoles, { name: 'UserRoles' });
registerEnumType(Status, { name: 'Status' });
registerEnumType(LeadStatus, { name: 'LeadStatus' });
registerEnumType(ClientStage, { name: 'ClientStage' });
registerEnumType(PhoneLabel, { name: 'PhoneLabel' });
registerEnumType(LeadEventType, { name: 'LeadEventType' });
