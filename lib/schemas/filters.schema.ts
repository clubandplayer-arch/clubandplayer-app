import { z } from 'zod';


export const FilterSchema = z.object({
view: z.enum(['opps', 'clubs']).default('opps'),
q: z.string().optional(),
region: z.string().optional(),
province: z.string().optional(),
city: z.string().optional(),
role: z
.preprocess((v) => (typeof v === 'string' ? (v.includes(',') ? v.split(',') : [v]) : v),
z.array(z.string()).optional()
),
gender: z.enum(['M', 'F', 'Mixed']).optional(),
level: z
.preprocess((v) => (typeof v === 'string' ? (v.includes(',') ? v.split(',') : [v]) : v),
z.array(z.string()).optional()
),
contractType: z
.preprocess((v) => (typeof v === 'string' ? (v.includes(',') ? v.split(',') : [v]) : v),
z.array(z.string()).optional()
),
minAge: z.coerce.number().min(5).max(60).optional(),
maxAge: z.coerce.number().min(5).max(60).optional(),
minPay: z.coerce.number().optional(),
maxPay: z.coerce.number().optional(),
state: z
.preprocess((v) => (typeof v === 'string' ? (v.includes(',') ? v.split(',') : [v]) : v),
z.array(z.enum(['active', 'expiring', 'expired', 'archived'])).optional()
),
sync: z
.preprocess((v) => (typeof v === 'string' ? (v.includes(',') ? v.split(',') : [v]) : v),
z.array(z.enum(['synced', 'outdated', 'conflict', 'local_edits', 'never_synced', 'error'])).optional()
),
source: z
.preprocess((v) => (typeof v === 'string' ? (v.includes(',') ? v.split(',') : [v]) : v),
z.array(z.string()).optional()
),
language: z.string().optional(),
sort: z.enum(['relevance', 'recent', 'closingSoon', 'payDesc', 'payAsc', 'distance', 'lastSync', 'updated']).default('recent'),
page: z.coerce.number().min(1).default(1),
pageSize: z.coerce.number().min(10).max(100).default(25),
});


export type Filters = z.infer<typeof FilterSchema>;