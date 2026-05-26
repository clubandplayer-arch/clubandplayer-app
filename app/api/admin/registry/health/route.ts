import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/api/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase server environment variables");
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

const ACTIVE_CLAIM_STATUSES = ["pending", "claim_pending", "in_review", "approved"];
const OPEN_DISPUTE_STATUSES = ["pending", "in_review"];

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    const isAdmin = await isAdminUser(supabaseAdmin, user);
    if (!isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const [claimsRes, disputesRes, mastersRes] = await Promise.all([
      supabaseAdmin.from("registry_claims").select("id,profile_id,registry_master_id,claim_status,submitted_at,approved_at,rejected_at").in("claim_status", ACTIVE_CLAIM_STATUSES).order("submitted_at", { ascending: false }),
      supabaseAdmin.from("registry_claim_disputes").select("id,claimant_profile_id,current_claimed_by_profile_id,registry_master_id,status,created_at").in("status", OPEN_DISPUTE_STATUSES).order("created_at", { ascending: false }),
      supabaseAdmin.from("registry_clubs_master").select("master_id,claimed_profile_id,is_claimed,updated_at").eq("is_claimed", true),
    ]);

    if (claimsRes.error) return NextResponse.json({ ok: false, error: claimsRes.error.message }, { status: 500 });
    if (disputesRes.error) return NextResponse.json({ ok: false, error: disputesRes.error.message }, { status: 500 });
    if (mastersRes.error) return NextResponse.json({ ok: false, error: mastersRes.error.message }, { status: 500 });

    const claims = claimsRes.data ?? [];
    const disputes = disputesRes.data ?? [];
    const masters = mastersRes.data ?? [];

    const claimsByMaster = new Map<string, typeof claims>();
    for (const row of claims) {
      const key = String(row.registry_master_id || "").trim();
      if (!key) continue;
      const list = claimsByMaster.get(key) ?? [];
      list.push(row);
      claimsByMaster.set(key, list);
    }

    const openDisputesByMaster = new Map<string, typeof disputes>();
    for (const row of disputes) {
      const key = String(row.registry_master_id || "").trim();
      if (!key) continue;
      const list = openDisputesByMaster.get(key) ?? [];
      list.push(row);
      openDisputesByMaster.set(key, list);
    }

    const collisions = {
      multiple_active_claims_same_master: [] as Array<{ registry_master_id: string; claims: typeof claims }>,
      approved_claim_profile_mismatch_master_owner: [] as Array<{ registry_master_id: string; master_claimed_profile_id: string | null; approved_profile_ids: string[] }>,
      open_dispute_without_claimed_master: [] as Array<{ registry_master_id: string; disputes: typeof disputes }>,
      open_dispute_and_active_claim_overlap: [] as Array<{ registry_master_id: string; disputes: typeof disputes; claims: typeof claims }>,
    };

    for (const [masterId, masterClaims] of claimsByMaster.entries()) {
      if (masterClaims.length > 1) collisions.multiple_active_claims_same_master.push({ registry_master_id: masterId, claims: masterClaims });
    }

    const masterById = new Map(masters.map((m) => [String(m.master_id), m]));

    for (const [masterId, masterClaims] of claimsByMaster.entries()) {
      const approvedProfileIds = Array.from(new Set(masterClaims.filter((c) => c.claim_status === "approved").map((c) => String(c.profile_id || "").trim()).filter(Boolean)));
      if (!approvedProfileIds.length) continue;
      const ownerProfileId = masterById.get(masterId)?.claimed_profile_id ? String(masterById.get(masterId)?.claimed_profile_id) : null;
      if (!ownerProfileId || !approvedProfileIds.includes(ownerProfileId) || approvedProfileIds.length > 1) {
        collisions.approved_claim_profile_mismatch_master_owner.push({ registry_master_id: masterId, master_claimed_profile_id: ownerProfileId, approved_profile_ids: approvedProfileIds });
      }
    }

    for (const [masterId, masterDisputes] of openDisputesByMaster.entries()) {
      const owner = masterById.get(masterId);
      if (!owner || !owner.is_claimed || !owner.claimed_profile_id) collisions.open_dispute_without_claimed_master.push({ registry_master_id: masterId, disputes: masterDisputes });
      const activeClaims = claimsByMaster.get(masterId) ?? [];
      if (activeClaims.length > 0) collisions.open_dispute_and_active_claim_overlap.push({ registry_master_id: masterId, disputes: masterDisputes, claims: activeClaims });
    }

    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      summary: {
        active_claims: claims.length,
        open_disputes: disputes.length,
        claimed_masters: masters.length,
        multiple_active_claims_same_master: collisions.multiple_active_claims_same_master.length,
        approved_claim_profile_mismatch_master_owner: collisions.approved_claim_profile_mismatch_master_owner.length,
        open_dispute_without_claimed_master: collisions.open_dispute_without_claimed_master.length,
        open_dispute_and_active_claim_overlap: collisions.open_dispute_and_active_claim_overlap.length,
      },
      collisions,
    });
  } catch (err) {
    console.error("ADMIN REGISTRY HEALTH ERROR", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
