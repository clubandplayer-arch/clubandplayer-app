import { NextRequest, NextResponse } from "next/server";
import { ViewsRepo } from "@/lib/data/views";
import { withApiHandler } from "@/lib/api/handler";
import { badRequest } from "@/lib/api/errors";

export const GET = withApiHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  if (!scope) throw badRequest("Missing scope");
  const data = await ViewsRepo.list(scope as any);
  return NextResponse.json({ items: data });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  if (!body.scope || !body.name || !body.filters) {
    throw badRequest("Missing fields");
  }
  const view = await ViewsRepo.create({
    scope: body.scope,
    name: body.name,
    filters: body.filters,
  });
  return NextResponse.json(view, { status: 201 });
});

export const DELETE = withApiHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) throw badRequest("Missing id");
  await ViewsRepo.remove(id);
  return NextResponse.json({ ok: true });
});
