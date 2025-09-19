// src/app/common/gql-enums.ts
import { registerEnumType } from '@nestjs/graphql';
import { $Enums } from '@prisma/client';

// Re-export concrete enum values for GraphQL & TS typing
export const LeadStatus = $Enums.LeadStatus;
// (Optional) add others here:
// export const Gender = $Enums.Gender;
// export const Profession = $Enums.Profession; // etc.

registerEnumType(LeadStatus, { name: 'LeadStatus' });
// If you add others, register once here as well:
// registerEnumType(Gender, { name: 'Gender' });

export type LeadStatusT = $Enums.LeadStatus;
