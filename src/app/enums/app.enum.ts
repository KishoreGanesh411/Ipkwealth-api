import { registerEnumType } from '@nestjs/graphql';
import {
  ApplicationStatusEnum,
  KycStatusEnum,
} from '../account_application/enums/application.enum';
import {
  AssignMode,
  ClientStage,
  LeadStageFilter,
  DormantReason,
  InteractionChannel,
  InteractionOutcome,
  LeadEventType,
  LeadStatus,
  PhoneLabel,
  ProductEnum,
  ProfessionEnum,
} from '../lead/enums/ipk-leadd.enum';
import { Status, UserRoles } from '../user/enums/user.enums';
import { Gender } from './common.enum';

registerEnumType(Gender, { name: 'Gender' });
registerEnumType(ProfessionEnum, { name: 'ProfessionEnum' });
registerEnumType(ProductEnum, { name: 'ProductEnum' });
registerEnumType(UserRoles, { name: 'UserRoles' });
registerEnumType(Status, { name: 'Status' });
registerEnumType(LeadStatus, { name: 'LeadStatus' });
registerEnumType(ClientStage, { name: 'ClientStage' });
registerEnumType(LeadStageFilter, { name: 'LeadStageFilter' });
registerEnumType(PhoneLabel, { name: 'PhoneLabel' });
registerEnumType(LeadEventType, { name: 'LeadEventType' });
registerEnumType(InteractionChannel, { name: 'InteractionChannel' });
registerEnumType(InteractionOutcome, { name: 'InteractionOutcome' });
registerEnumType(DormantReason, { name: 'DormantReason' });
registerEnumType(ApplicationStatusEnum, { name: 'ApplicationStatus' });
registerEnumType(KycStatusEnum, { name: 'KycStatus' });
registerEnumType(AssignMode, { name: 'AssignMode' });
