// lib/types/index.ts
import { z } from "zod";
import { ClubSchema } from "../schemas/club.schema";
import { OpportunitySchema } from "../schemas/opportunity.schema";

export type Club = z.infer<typeof ClubSchema>;
export type Opportunity = z.infer<typeof OpportunitySchema>;
export type SyncStatus = NonNullable<Club["syncStatus"]>;
