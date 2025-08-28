"use client";

/**
 * FilterBar riutilizzabile (Opportunità / Club) con sincronizzazione querystring.
 * FILE COMPLETO — REPLACE FULL.
 */

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Filters } from "@/lib/schemas/filters.schema";
import { FilterSchema } from "@/lib/schemas/filters.schema";

/** Scope della pagina che usa la barra filtri */
type Scope = "opportunities" | "clubs";

interface Props {
  scope: Scope;
}

/** Serializza un oggetto filtri in query string */
function toQueryString(obj: Partial<Filters>) {
  const sp = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return;
    if (Array.isArray(v)) sp.set(k, v.join(","));
    else sp.set(k, String(v));
  });
  return sp.toString();
}

export default function FilterBar({ scope }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Stato iniziale derivato dalla URL
  const initial = useMemo(() => {
    const raw = Object.fromEntries(searchParams.entries());
    const parsed = FilterSchema.safeParse(raw);
    return parsed.success
      ? parsed.data
      : FilterSchema.parse({
          view: scope === "oppor
