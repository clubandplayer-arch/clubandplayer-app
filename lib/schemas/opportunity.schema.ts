import { z } from 'zod';


export const StipendRangeSchema = z.object({
min: z.number().optional(),
max: z.number().optional(),
currency: z.enum(['EUR']).default('EUR').optional(),
});


export const AgeRangeSchema = z.object({
min: z.number().optional(),
max: z.number().optional(),
});


export const LocationSchema = z.object({
region: z.string().optional(),
province: z.string().optional(),
city: z.string().optional(),
lat: z.number().optional(),
lng: z.number().optional(),
});


export const OpportunitySchema = z.object({
id: z.string(),
clubId: z.string().optional(),
title: z.string(),
role: z.string().optional(),
sport: z.literal('Calcio').optional(),
gender: z.enum(['M', 'F', 'Mixed']).optional(),
level: z.string().optional(),
contractType: z.enum(['Trial', 'Contratto', 'Prestito', 'Stage']).optional(),
stipendRange: StipendRangeSchema.optional(),
ageRange: AgeRangeSchema.optional(),
expiresAt: z.string().datetime().optional(),
location: LocationSchema.optional(),
remote: z.boolean().optional(),
description: z.string().optional(),
tags: z.array(z.string()).optional(),
language: z.string().optional(),
visibility: z.enum(['public', 'unlisted', 'archived']).default('public'),
lastSyncAt: z.string().datetime().optional(),
syncStatus: z.enum(['synced', 'outdated', 'conflict', 'local_edits', 'error', 'never_synced']).optional(),
updatedAt: z.string().datetime(),
source: z.string().optional(),
club: z
.object({ id: z.string(), name: z.string().optional() })
.optional(),
});


export type OpportunityDTO = z.infer<typeof OpportunitySchema>;