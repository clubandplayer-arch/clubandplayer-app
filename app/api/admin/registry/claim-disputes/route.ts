import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { isAdminUser } from "@/lib/api/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileNotificationTarget = {
  id: string;
  user_id: string | null;
  display_name: string | null;
};

type RegistryClubNotificationTarget = {
  id: string;
  source_club_id: string | null;
  name: string | null;
};

type RegistryDisputeTransferRow = {
  id: string;
  registry_club_id: string | null;
  registry_master_id: string | null;
  claimant_profile_id: string;
  current_claimed_by_profile_id: string | null;
  status: string;
};

type RegistryClubAdminRow = {
  id: string;
  source_club_id: string | null;
  name: string | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
};

type RegistryMasterAdminRow = {
  master_id: string;
  denominazione: string | null;
  comune: string | null;
  provincia: string | null;
  regione: string | null;
};

type ProfileAdminRow = {
  id: string;
  display_name: string | null;
  account_type: string | null;
  type: string | null;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isNonEmptyDbId(value: unknown) {
  const text = clean(value);
  return Boolean(text && text !== "null" && text !== "undefined");
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function requireAdmin(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      supabaseAdmin,
      user: null,
      adminProfileId: null,
      response: NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return {
      supabaseAdmin,
      user: null,
      adminProfileId: null,
      response: NextResponse.json(
        { ok: false, error: "Invalid session" },
        { status: 401 }
      ),
    };
  }

  const isAdmin = await isAdminUser(supabaseAdmin, user);

  if (!isAdmin) {
    return {
      supabaseAdmin,
      user,
      adminProfileId: null,
      response: NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminProfileError) {
    return {
      supabaseAdmin,
      user,
      adminProfileId: null,
      response: NextResponse.json(
        { ok: false, error: adminProfileError.message },
        { status: 500 }
      ),
    };
  }

  return {
    supabaseAdmin,
    user,
    adminProfileId: adminProfile?.id ? String(adminProfile.id) : null,
    response: null,
  };
}

async function getProfileById(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  profileId: string
) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, user_id, display_name")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;

  return data as ProfileNotificationTarget | null;
}

async function getRegistryClubDisplay(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  dispute: RegistryDisputeTransferRow
): Promise<RegistryClubNotificationTarget | null> {
  if (isNonEmptyDbId(dispute.registry_master_id)) {
    const { data, error } = await supabaseAdmin
      .from("registry_clubs_master")
      .select("master_id, denominazione")
      .eq("master_id", dispute.registry_master_id)
      .maybeSingle();

    if (error) throw error;

    const master = data as
        | { master_id: string; denominazione: string | null }
        | null;

    if (!master) return null;

    return {
      id: String(master.master_id),
      source_club_id: null,
      name: master.denominazione ? String(master.denominazione) : null,
    };
  }

  if (!isNonEmptyDbId(dispute.registry_club_id)) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("registry_clubs")
    .select("id, source_club_id, name")
    .eq("id", dispute.registry_club_id)
    .maybeSingle();

  if (error) throw error;

  return data as RegistryClubNotificationTarget | null;
}

async function insertNotification({
  supabaseAdmin,
  recipientProfileId,
  userId,
  kind,
  message,
  payload,
}: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  recipientProfileId: string;
  userId: string;
  kind: string;
  message: string;
  payload: Record<string, unknown>;
}) {
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    recipient_profile_id: recipientProfileId,
    actor_profile_id: null,
    kind,
    type: kind,
    message,
    read: false,
    payload,
    created_at: now,
    updated_at: now,
  });

  if (error) throw error;
}

async function createDisputeResultNotifications({
  supabaseAdmin,
  dispute,
  action,
}: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  dispute: RegistryDisputeTransferRow;
  action: "accepted" | "rejected";
}) {
  const claimantProfileId = String(dispute.claimant_profile_id);
  const previousOwnerProfileId = dispute.current_claimed_by_profile_id
    ? String(dispute.current_claimed_by_profile_id)
    : null;

  const claimantProfile = await getProfileById(supabaseAdmin, claimantProfileId);
  const previousOwnerProfile = previousOwnerProfileId
    ? await getProfileById(supabaseAdmin, previousOwnerProfileId)
    : null;
  const registryClub = await getRegistryClubDisplay(supabaseAdmin, dispute);

  const clubName = registryClub?.name || "società Registro CONI";
  const isAccepted = action === "accepted";

  if (claimantProfile?.user_id) {
    const claimantMessage = isAccepted
      ? `Il tuo reclamo Registro CONI per ${clubName} è stato accettato.`
      : `Il tuo reclamo Registro CONI per ${clubName} è stato rifiutato.`;

    await insertNotification({
      supabaseAdmin,
      recipientProfileId: claimantProfileId,
      userId: claimantProfile.user_id,
      kind: "registry_claim_dispute",
      message: claimantMessage,
      payload: {
        title: isAccepted
          ? "Reclamo Registro CONI accettato"
          : "Reclamo Registro CONI rifiutato",
        preview: claimantMessage,
        dispute_id: dispute.id,
        registry_club_id: dispute.registry_club_id,
        registry_master_id: dispute.registry_master_id,
        registry_club_name: clubName,
        source_club_id: registryClub?.source_club_id ?? null,
        status: action,
      },
    });
  }

  if (isAccepted && previousOwnerProfile?.user_id) {
    const ownerMessage = `La società Registro CONI ${clubName} è stata trasferita ad un altro profilo Club dopo revisione reclamo.`;

    await insertNotification({
      supabaseAdmin,
      recipientProfileId: previousOwnerProfileId!,
      userId: previousOwnerProfile.user_id,
      kind: "registry_claim_transfer",
      message: ownerMessage,
      payload: {
        title: "Società Registro CONI trasferita",
        preview: ownerMessage,
        dispute_id: dispute.id,
        registry_club_id: dispute.registry_club_id,
        registry_master_id: dispute.registry_master_id,
        registry_club_name: clubName,
        source_club_id: registryClub?.source_club_id ?? null,
        status: "transferred",
      },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabaseAdmin, response } = await requireAdmin(req);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";

    const { data: disputes, error: disputesError } = await supabaseAdmin
      .from("registry_claim_disputes")
      .select(
        "id, registry_club_id, registry_master_id, claimant_profile_id, current_claimed_by_profile_id, reason, status, admin_notes, created_at, updated_at, reviewed_at"
      )
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (disputesError) {
      return NextResponse.json(
        { ok: false, error: disputesError.message },
        { status: 500 }
      );
    }

    const rows = (disputes ?? []) as RegistryDisputeTransferRow[];

    const registryClubIds = Array.from(
      new Set(
        rows
          .map((row) => row.registry_club_id)
          .filter(isNonEmptyDbId)
          .map(String)
      )
    );

    const registryMasterIds = Array.from(
      new Set(
        rows
          .map((row) => row.registry_master_id)
          .filter(isNonEmptyDbId)
          .map(String)
      )
    );

    const profileIds = Array.from(
      new Set(
        rows
          .flatMap((row) => [
            row.claimant_profile_id,
            row.current_claimed_by_profile_id,
          ])
          .filter(isNonEmptyDbId)
          .map(String)
      )
    );

    const clubById = new Map<string, RegistryClubAdminRow>();
    const masterById = new Map<string, RegistryClubAdminRow>();
    const profileById = new Map<string, ProfileAdminRow>();

    if (registryClubIds.length) {
      const { data: clubs, error: clubsError } = await supabaseAdmin
        .from("registry_clubs")
        .select("id, source_club_id, name, region, province, municipality")
        .in("id", registryClubIds);

      if (clubsError) {
        return NextResponse.json(
          { ok: false, error: clubsError.message },
          { status: 500 }
        );
      }

      ((clubs ?? []) as RegistryClubAdminRow[]).forEach((club) =>
        clubById.set(String(club.id), club)
      );
    }

    if (registryMasterIds.length) {
      const { data: masters, error: mastersError } = await supabaseAdmin
        .from("registry_clubs_master")
        .select("master_id, denominazione, comune, provincia, regione")
        .in("master_id", registryMasterIds);

      if (mastersError) {
        return NextResponse.json(
          { ok: false, error: mastersError.message },
          { status: 500 }
        );
      }

      ((masters ?? []) as RegistryMasterAdminRow[]).forEach((master) =>
        masterById.set(String(master.master_id), {
          id: String(master.master_id),
          source_club_id: null,
          name: master.denominazione ? String(master.denominazione) : null,
          region: master.regione ? String(master.regione) : null,
          province: master.provincia ? String(master.provincia) : null,
          municipality: master.comune ? String(master.comune) : null,
        })
      );
    }

    if (profileIds.length) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, account_type, type")
        .in("id", profileIds);

      if (profilesError) {
        return NextResponse.json(
          { ok: false, error: profilesError.message },
          { status: 500 }
        );
      }

      ((profiles ?? []) as ProfileAdminRow[]).forEach((profile) =>
        profileById.set(String(profile.id), profile)
      );
    }

    const items = rows.map((row) => ({
      ...row,
      registry_clubs:
        (row.registry_master_id
          ? masterById.get(String(row.registry_master_id))
          : null) ??
        (row.registry_club_id
          ? clubById.get(String(row.registry_club_id))
          : null) ??
        null,
      claimant_profile: profileById.get(String(row.claimant_profile_id)) ?? null,
      current_owner_profile: row.current_claimed_by_profile_id
        ? profileById.get(String(row.current_claimed_by_profile_id)) ?? null
        : null,
    }));

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (err) {
    console.error("ADMIN REGISTRY CLAIM DISPUTES GET ERROR", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabaseAdmin, adminProfileId, response } = await requireAdmin(req);
    if (response) return response;

    const body = await req.json().catch(() => null);
    const disputeId = typeof body?.id === "string" ? body.id : "";
    const action = typeof body?.action === "string" ? body.action : "";
    const adminNotes =
      typeof body?.admin_notes === "string" ? body.admin_notes.trim() : null;

    if (!disputeId || !["accepted", "rejected"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Payload reclamo non valido." },
        { status: 400 }
      );
    }

    const { data: existingDispute, error: disputeSelectError } =
      await supabaseAdmin
        .from("registry_claim_disputes")
        .select(
          "id, registry_club_id, registry_master_id, claimant_profile_id, current_claimed_by_profile_id, status"
        )
        .eq("id", disputeId)
        .eq("status", "pending")
        .maybeSingle();

    if (disputeSelectError) {
      return NextResponse.json(
        { ok: false, error: disputeSelectError.message },
        { status: 500 }
      );
    }

    if (!existingDispute) {
      return NextResponse.json(
        { ok: false, error: "Reclamo non trovato o già gestito." },
        { status: 404 }
      );
    }

    const disputeRow = existingDispute as RegistryDisputeTransferRow;
    const now = new Date().toISOString();

    if (action === "accepted") {
      if (isNonEmptyDbId(disputeRow.registry_master_id)) {
        const { error: transferMasterError } = await supabaseAdmin
          .from("registry_clubs_master")
          .update({
            is_claimed: true,
            claimed_profile_id: disputeRow.claimant_profile_id,
            updated_at: now,
          })
          .eq("master_id", disputeRow.registry_master_id);

        if (transferMasterError) {
          return NextResponse.json(
            { ok: false, error: transferMasterError.message },
            { status: 500 }
          );
        }

        await supabaseAdmin
          .from("registry_claims")
          .update({
            claim_status: "rejected",
            rejected_at: now,
            approved_at: null,
            updated_at: now,
          })
          .eq("registry_master_id", disputeRow.registry_master_id)
          .neq("profile_id", disputeRow.claimant_profile_id)
          .in("claim_status", ["pending", "in_review", "approved"]);

        const { data: existingClaim } = await supabaseAdmin
          .from("registry_claims")
          .select("id")
          .eq("registry_master_id", disputeRow.registry_master_id)
          .eq("profile_id", disputeRow.claimant_profile_id)
          .maybeSingle();

        if (existingClaim?.id) {
          await supabaseAdmin
            .from("registry_claims")
            .update({
              claim_status: "approved",
              claim_method: "dispute_transfer",
              approved_at: now,
              rejected_at: null,
              updated_at: now,
            })
            .eq("id", existingClaim.id);
        } else {
          await supabaseAdmin.from("registry_claims").insert({
            registry_master_id: disputeRow.registry_master_id,
            registry_club_id: null,
            profile_id: disputeRow.claimant_profile_id,
            claim_status: "approved",
            claim_method: "dispute_transfer",
            approved_at: now,
            rejected_at: null,
            updated_at: now,
          });
        }
      } else if (isNonEmptyDbId(disputeRow.registry_club_id)) {
        const { error: transferError } = await supabaseAdmin
          .from("registry_clubs")
          .update({
            claim_status: "claimed",
            claimed_by_profile_id: disputeRow.claimant_profile_id,
            claimed_at: now,
            updated_at: now,
          })
          .eq("id", disputeRow.registry_club_id);

        if (transferError) {
          return NextResponse.json(
            { ok: false, error: transferError.message },
            { status: 500 }
          );
        }

        await supabaseAdmin
          .from("registry_claims")
          .update({
            claim_status: "rejected",
            rejected_at: now,
            approved_at: null,
            updated_at: now,
          })
          .eq("registry_club_id", disputeRow.registry_club_id)
          .neq("profile_id", disputeRow.claimant_profile_id)
          .in("claim_status", ["pending", "in_review"]);

        await supabaseAdmin.from("registry_claims").upsert(
          {
            registry_club_id: disputeRow.registry_club_id,
            profile_id: disputeRow.claimant_profile_id,
            claim_status: "approved",
            claim_method: "dispute_transfer",
            approved_at: now,
            rejected_at: null,
            updated_at: now,
          },
          {
            onConflict: "registry_club_id,profile_id",
          }
        );
      }
    }

    const { data: dispute, error: updateError } = await supabaseAdmin
      .from("registry_claim_disputes")
      .update({
        status: action,
        admin_notes: adminNotes,
        reviewed_at: now,
        reviewed_by_profile_id: adminProfileId,
        updated_at: now,
      })
      .eq("id", disputeId)
      .eq("status", "pending")
      .select("id, status, reviewed_at")
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    await createDisputeResultNotifications({
      supabaseAdmin,
      dispute: disputeRow,
      action: action as "accepted" | "rejected",
    });

    return NextResponse.json({
      ok: true,
      dispute,
      transferred: action === "accepted",
    });
  } catch (err) {
    console.error("ADMIN REGISTRY CLAIM DISPUTES PATCH ERROR", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}