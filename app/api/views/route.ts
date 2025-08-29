// app/api/views/route.ts
import { NextRequest, NextResponse } from "next/server";

type Scope = "clubs" | "opportunities";
type SavedView = {
  id: string;
  name: string;
  params: string; // es: "?q=roma&country=IT&scope=clubs"
  scope: Scope;
  createdAt: number;
};

// Mock in-memory (solo per dev/preview; in serverless può non persistere)
const store = new Map<Scope, SavedView[]>();

function list(scope?: Scope): SavedView[] {
  if (!scope) {
    const all: SavedView[] = [];
    for (const arr of store.values()) all.push(...arr);
    return all;
  }
  return store.get(scope) ?? [];
}

function add(view: SavedView) {
  const arr = store.get(view.scope) ?? [];
  store.set(view.scope, [view, ...arr].slice(0, 50)); // hard cap
}

function del(scope: Scope, id: string) {
  const arr = store.get(scope) ?? [];
  store.set(
    scope,
    arr.filter((v) => v.id !== id)
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") as Scope | null;

  const items = list(scope ?? undefined);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  let body: Partial<SavedView> | null = null;
  try {
    body = (await req.json()) as Partial<SavedView>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.name || !body?.params || !body?.scope) {
    return NextResponse.json(
      { error: "Missing required fields: name, params, scope" },
      { status: 400 }
    );
  }

  const view: SavedView = {
    id: crypto.randomUUID(),
    name: String(body.name),
    params: String(body.params),
    scope: body.scope as Scope,
    createdAt: Date.now(),
  };

  add(view);
  return NextResponse.json(view, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const scope = searchParams.get("scope") as Scope | null;

  if (!id || !scope) {
    return NextResponse.json(
      { error: "Missing id or scope" },
      { status: 400 }
    );
  }

  del(scope, id);
  return NextResponse.json({ ok: true }, { status: 200 });
}
