// lib/types/views.ts
import { SearchFilters } from "@/lib/types/entities";

export type SavedView = {
  id: string;
  scope: "opportunities" | "clubs";   // identifica la sezione
  name: string;                       // nome della vista
  filters: SearchFilters;             // i filtri serializzati
  createdAt: string;                  // ISO date
};
