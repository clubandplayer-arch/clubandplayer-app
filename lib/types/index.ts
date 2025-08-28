import { z } from 'zod';
import { ClubSchema } from '@/lib/schemas/club.schema';
import { OpportunitySchema } from '@/lib/schemas/opportunity.schema';


export type Club = z.infer<typeof ClubSchema>;
export type Opportunity = z.infer<typeof OpportunitySchema>;
export type SyncStatus = NonNullable<Club['syncStatus']>;