/* eslint-disable no-console */
/**
 * Stub minimale per le "saved views".
 * GET: ritorna un array (anche vuoto) di viste.
 * POST: accetta un body JSON e ritorna quello che ha salvato (mock).
 */

import { NextResponse } from "next/server";

type SavedView = {
  id: string;
  name: string;
  params: Record<string, unknown>;
  createdAt: string;
};

const mockStore: SavedView[] = [];

export async function GET(): Promise<NextResponse<SavedView[]>> {
  return NextResponse.json(mockStore, { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse<SavedView>> {
  const body = (await request.json()) as Partial<SavedView>;
  const item: SavedView = {
    id: body.id ?? crypto.randomUUID(),
    name: body.name ?? "Untitled",
    params: body.params ?? {},
    createdAt: new Date().toISOString(),
  };
  mockStore.push(item);
  return NextResponse.json(item, { status: 201 });
}
