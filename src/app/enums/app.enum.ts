import { registerEnumType } from '@nestjs/graphql';
import {
  ProfessionEnum,
  ProductEnum,
  LeadStatus,
} from '../lead/enums/ipk-leadd.enum';
import { Gender } from './common.enum';
import { UserRoles, Status } from '../user/enums/user.enums';

registerEnumType(Gender, { name: 'Gender' });
registerEnumType(ProfessionEnum, { name: 'ProfessionEnum' });
registerEnumType(ProductEnum, { name: 'ProductEnum' });
registerEnumType(UserRoles, { name: 'UserRoles' });
registerEnumType(Status, { name: 'Status' });
registerEnumType(LeadStatus, { name: 'LeadStatus' });
