import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function uniq<T>(arr: T[] | null | undefined) { return Array.from(new Set(arr ?? [])); }

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = auth.user.id;

  const { data: profile } = await supabase.from("profiles").select("id,type").eq("id", userId).single();
  if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

  const scope = (new URL(req.url).searchParams.get("scope") || "").toLowerCase();

  // CLUB: ricevute
  if (scope === "received") {
    if (profile.type !== "club") return NextResponse.json({ error: "forbidden_not_club" }, { status: 403 });

    const { data: myClub } = await supabase.from("clubs").select("id").eq("owner_user_id", userId).limit(1).maybeSingle();
    if (!myClub?.id) return NextResponse.json({ applications: [] });

    const { data: oppIdsRows } = await supabase.from("opportunities").select("id").eq("club_id", myClub.id);
    const oppIds = uniq(oppIdsRows?.map(r => r.id));
    if (oppIds.length === 0) return NextResponse.json({ applications: [] });

    const { data: apps } = await supabase
      .from("applications")
      .select("id, status, note, created_at, athlete_id, opportunity_id")
      .in("opportunity_id", oppIds)
      .order("created_at", { ascending: false });

    if (!apps?.length) return NextResponse.json({ applications: [] });

    const athleteIds = uniq(apps.map(a => a.athlete_id));
    const joinedOppIds = uniq(apps.map(a => a.opportunity_id));

    const [{ data: athletes }, { data: opps }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, city, age").in("id", athleteIds),
      supabase.from("opportunities").select("id, title, sport, location_city").in("id", joinedOppIds),
    ]);

    const athletesById = Object.fromEntries((athletes ?? []).map(a => [a.id, a]));
    const oppsById = Object.fromEntries((opps ?? []).map(o => [o.id, o]));

    const payload = apps.map(a => ({
      id: a.id,
      status: a.status,
      created_at: a.created_at,
      note: a.note ?? null,
      athlete: athletesById[a.athlete_id] ?? null,
      opportunity: oppsById[a.opportunity_id] ?? null,
    }));

    return NextResponse.json({ applications: payload });
  }

  // ATLETA: inviate (default)
  if (profile.type !== "athlete") return NextResponse.json({ error: "forbidden_not_athlete" }, { status: 403 });

  const { data: apps } = await supabase
    .from("applications")
    .select("id, status, note, created_at, opportunity_id")
    .eq("athlete_id", userId)
    .order("created_at", { ascending: false });

  if (!apps?.length) return NextResponse.json({ applications: [] });

  const oppIds = uniq(apps.map(a => a.opportunity_id));
  const { data: opps } = await supabase
    .from("opportunities")
    .select("id, title, sport, location_city, club_id")
    .in("id", oppIds);

  const clubIds = uniq((opps ?? []).map(o => o.club_id).filter(Boolean));
  const { data: clubs } = await supabase.from("clubs").select("id, name").in("id", clubIds);

  const clubsById = Object.fromEntries((clubs ?? []).map(c => [c.id, c]));
  const oppsById = Object.fromEntries((opps ?? []).map(o => [o.id, o]));

  const payload = apps.map(a => {
    const o = oppsById[a.opportunity_id];
    return {
      id: a.id,
      status: a.status,
      created_at: a.created_at,
      note: a.note ?? null,
      opportunity: o ? {
        id: o.id,
        title: o.title,
        sport: o.sport,
        location_city: o.location_city,
        club_name: o.club_id ? clubsById[o.club_id]?.name ?? null : null,
      } : null,
    };
  });

  return NextResponse.json({ applications: payload });
}
