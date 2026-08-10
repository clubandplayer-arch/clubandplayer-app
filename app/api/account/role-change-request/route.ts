import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getResendConfig } from "@/lib/server/resendConfig";

export const runtime = "nodejs";

const SUPPORT_EMAIL = "support@clubandplayer.com";
const ACCOUNT_TYPES = [
  "athlete",
  "staff",
  "club",
  "fan",
  "institution",
] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

const ROLE_LABELS: Record<AccountType, string> = {
  athlete: "Player",
  staff: "Staff",
  club: "Club",
  fan: "Fan",
  institution: "Ente",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user?.email) {
      return NextResponse.json(
        { ok: false, error: "Devi effettuare il login." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const requestedRole =
      typeof body?.requestedRole === "string" ? body.requestedRole : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (
      !ACCOUNT_TYPES.includes(requestedRole as AccountType) ||
      reason.length < 20 ||
      reason.length > 2000
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Seleziona un ruolo e inserisci una motivazione da 20 a 2000 caratteri.",
        },
        { status: 400 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, account_type, display_name, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { ok: false, error: "Profilo non trovato." },
        { status: 404 },
      );
    }

    const currentRole = profile.account_type as AccountType | null;
    if (!currentRole || !ACCOUNT_TYPES.includes(currentRole)) {
      return NextResponse.json(
        { ok: false, error: "Il ruolo attuale non è valido." },
        { status: 400 },
      );
    }
    if (requestedRole === currentRole) {
      return NextResponse.json(
        { ok: false, error: "Seleziona un ruolo diverso da quello attuale." },
        { status: 400 },
      );
    }

    const resendConfig = getResendConfig();
    if (!resendConfig.ok) {
      console.error(
        "Configurazione email incompleta:",
        resendConfig.missing.join(", "),
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Il servizio email non è temporaneamente disponibile.",
        },
        { status: 503 },
      );
    }

    if (resendConfig.noop) {
      console.info("NOOP_EMAILS: richiesta cambio ruolo validata", {
        userId: user.id,
        currentRole,
        requestedRole,
      });
      return NextResponse.json({ ok: true, noop: true });
    }

    const requestedRoleTyped = requestedRole as AccountType;
    const profileName =
      profile.display_name || profile.full_name || "Non indicato";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
    const profileUrl = baseUrl ? `${baseUrl}/admin/${profile.id}` : null;
    const resend = new Resend(resendConfig.apiKey);
    const result = await resend.emails.send({
      from: resendConfig.from,
      to: SUPPORT_EMAIL,
      replyTo: user.email,
      subject: `Richiesta cambio ruolo – ${ROLE_LABELS[currentRole]} → ${ROLE_LABELS[requestedRoleTyped]}`,
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial;line-height:1.5;color:#111827">
          <h1 style="font-size:20px">Nuova richiesta di cambio ruolo</h1>
          <table style="border-collapse:collapse">
            <tr><td style="padding:4px 12px 4px 0"><b>Utente</b></td><td>${escapeHtml(profileName)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Email</b></td><td>${escapeHtml(user.email)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>User ID</b></td><td>${escapeHtml(user.id)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Profile ID</b></td><td>${escapeHtml(profile.id)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Ruolo attuale</b></td><td>${ROLE_LABELS[currentRole]}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Ruolo richiesto</b></td><td>${ROLE_LABELS[requestedRoleTyped]}</td></tr>
          </table>
          <h2 style="font-size:16px;margin-bottom:6px">Motivazione</h2>
          <div style="white-space:pre-wrap;padding:12px;background:#f3f4f6;border-radius:8px">${escapeHtml(reason)}</div>
          ${profileUrl ? `<p><a href="${escapeHtml(profileUrl)}">Apri il profilo nell’area amministrativa</a></p>` : ""}
          <p style="color:#6b7280;font-size:12px">Rispondendo a questa email, la risposta sarà indirizzata all’utente.</p>
        </div>
      `,
    });

    if (result.error) {
      console.error(
        "Invio richiesta cambio ruolo fallito:",
        result.error.message,
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Non è stato possibile inviare la richiesta. Riprova.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Errore richiesta cambio ruolo:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Errore imprevisto durante l’invio della richiesta.",
      },
      { status: 500 },
    );
  }
}
