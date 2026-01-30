"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { fetchLocationChildren } from "@/lib/geo/location";

type PackageId = "starter" | "growth" | "performance";
type ObjectiveId = "visibility" | "leads" | "both";
type DurationId = 30 | 60 | 90;
type LocationOptionString = { id: string; name: string };

const BRAND_BLUE = "#036f9a";

const PACKAGES: Record<
  PackageId,
  {
    label: string;
    basePriceProvince30d: number;
    placements: string[];
    includes: string[];
  }
> = {
  starter: {
    label: "Starter",
    basePriceProvince30d: 79,
    placements: ["Sidebar Bottom", "Left Bottom (rotazione)"],
    includes: ["Report base (impression + click)"],
  },
  growth: {
    label: "Growth",
    basePriceProvince30d: 149,
    placements: ["Sidebar Top", "Left Top"],
    includes: ["Report settimanale", "1 cambio creatività gratuito (a metà mese)"],
  },
  performance: {
    label: "Performance",
    basePriceProvince30d: 249,
    placements: ["Infeed (ogni ~3 post)"],
    includes: ["Report settimanale", "Ottimizzazione (1 cambio creatività/settimana)"],
  },
};

const OBJECTIVES: Record<ObjectiveId, string> = {
  visibility: "Visibilità (brand)",
  leads: "Contatti (lead)",
  both: "Entrambi (brand + contatti)",
};

const DURATION_MULTIPLIER: Record<DurationId, number> = {
  30: 1,
  60: 1.85,
  90: 2.7,
};

function euro(amount: number) {
  const rounded = Math.round(amount);
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(rounded);
}

function buildLeadSummary(params: {
  pkg: PackageId;
  regionName: string;
  provinceName: string;
  cityName: string;
  objective: ObjectiveId;
  duration: DurationId;
  exclusive: boolean;
  estimate: number;
}) {
  const {
    pkg,
    regionName,
    provinceName,
    cityName,
    objective,
    duration,
    exclusive,
    estimate,
  } = params;

  const lines = [
    "=== Richiesta Sponsorizzazione (Club & Player) ===",
    `Pacchetto: ${PACKAGES[pkg].label}`,
    `Posizionamenti: ${PACKAGES[pkg].placements.join(" • ")}`,
    "Target: Italia",
    `Regione: ${regionName || "-"}`,
    `Provincia: ${provinceName || "-"}`,
    `Città: ${cityName || "-"}`,
    `Durata: ${duration} giorni`,
    `Obiettivo: ${OBJECTIVES[objective]}`,
    `Esclusiva di categoria: ${exclusive ? "Sì (+40%)" : "No"}`,
    `Stima indicativa: ${euro(estimate)} (prezzi beta soggetti a conferma)`,
  ];

  return lines.join("\n");
}

export default function SponsorPage() {
  // configuratore
  const [pkg, setPkg] = useState<PackageId>("performance");
  const [regionId, setRegionId] = useState<string>("");
  const [provinceId, setProvinceId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [regions, setRegions] = useState<LocationOptionString[]>([]);
  const [provinces, setProvinces] = useState<LocationOptionString[]>([]);
  const [cities, setCities] = useState<LocationOptionString[]>([]);
  const [objective, setObjective] = useState<ObjectiveId>("both");
  const [duration, setDuration] = useState<DurationId>(30);
  const [exclusive, setExclusive] = useState<boolean>(false);

  // form contatto
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [freeMessage, setFreeMessage] = useState("");

  // anti-spam client (honeypot + cooldown)
  const [honeypot, setHoneypot] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  const preventivoRef = useRef<HTMLDivElement | null>(null);

  const estimate = useMemo(() => {
    const base = PACKAGES[pkg].basePriceProvince30d;
    const t = 1;
    const d = DURATION_MULTIPLIER[duration];
    const ex = exclusive ? 1.4 : 1;
    return base * t * d * ex;
  }, [pkg, duration, exclusive]);

  const selectedRegionName = useMemo(
    () => regions.find((item) => item.id === regionId)?.name ?? "",
    [regions, regionId]
  );
  const selectedProvinceName = useMemo(
    () => provinces.find((item) => item.id === provinceId)?.name ?? "",
    [provinces, provinceId]
  );
  const selectedCityName = useMemo(
    () => cities.find((item) => item.id === cityId)?.name ?? "",
    [cities, cityId]
  );

  const leadSummary = useMemo(
    () =>
      buildLeadSummary({
        pkg,
        regionName: selectedRegionName,
        provinceName: selectedProvinceName,
        cityName: selectedCityName,
        objective,
        duration,
        exclusive,
        estimate,
      }),
    [
      pkg,
      selectedRegionName,
      selectedProvinceName,
      selectedCityName,
      objective,
      duration,
      exclusive,
      estimate,
    ]
  );

  const supabase = useMemo(() => supabaseBrowser(), []);

  useEffect(() => {
    let active = true;

    (async () => {
      const nextRegions = await fetchLocationChildren(supabase, "region", null);
      if (active) {
        setRegions(
          nextRegions.map((item) => ({
            id: String(item.id),
            name: item.name,
          }))
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    let active = true;

    if (!regionId) {
      setProvinces([]);
      setCities([]);
      setProvinceId("");
      setCityId("");
      return () => {
        active = false;
      };
    }

    (async () => {
      const nextProvinces = await fetchLocationChildren(
        supabase,
        "province",
        regionId
      );
      if (active) {
        setProvinces(
          nextProvinces.map((item) => ({
            id: String(item.id),
            name: item.name,
          }))
        );
        setProvinceId("");
        setCityId("");
      }
    })();

    return () => {
      active = false;
    };
  }, [regionId, supabase]);

  useEffect(() => {
    let active = true;

    if (!provinceId) {
      setCities([]);
      setCityId("");
      return () => {
        active = false;
      };
    }

    (async () => {
      const nextCities = await fetchLocationChildren(
        supabase,
        "municipality",
        provinceId
      );
      if (active) {
        setCities(
          nextCities.map((item) => ({
            id: String(item.id),
            name: item.name,
          }))
        );
        setCityId("");
      }
    })();

    return () => {
      active = false;
    };
  }, [provinceId, supabase]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const t = setInterval(() => {
      setCooldownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownSeconds]);

  function scrollToPreventivo() {
    preventivoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setErrorMsg("");
    setStatus("idle");

    if (cooldownSeconds > 0) {
      setStatus("error");
      setErrorMsg(`Attendi ${cooldownSeconds}s prima di inviare di nuovo.`);
      return;
    }

    // validazione minima client
    if (!name.trim() || !company.trim() || !email.trim()) {
      setStatus("error");
      setErrorMsg("Compila almeno Nome, Azienda e Email.");
      return;
    }

    // Honeypot: se compilato, facciamo finta di successo (anti bot)
    if (honeypot.trim()) {
      setStatus("success");
      setCooldownSeconds(20);
      return;
    }

    const targetLabel = "Italia";

    // Messaggio finale: include preventivo + messaggio libero
    const finalMessage =
      leadSummary +
      "\n\n--- Messaggio ---\n" +
      (freeMessage.trim() ? freeMessage.trim() : "(nessun messaggio aggiuntivo)");

    const payload = {
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      location: targetLabel,
      // usiamo budget come stima (così lo vedi subito in admin)
      budget: euro(estimate),
      message: finalMessage,
      // chiave honeypot (deve combaciare con la route esistente)
      company_website: honeypot,
    };

    try {
      setStatus("sending");
      const res = await fetch("/api/ads/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Invio fallito.";
        try {
          const data = await res.json();
          if (typeof data?.error === "string" && data.error.trim()) {
            msg = data.error.trim();
          }
        } catch {
          const txt = await res.text().catch(() => "");
          if (txt.trim()) {
            msg = txt.trim();
          }
        }
        throw new Error(msg);
      }

      setStatus("success");
      setCooldownSeconds(20);

      // reset SOLO campi contatto (manteniamo configuratore per comodità)
      setFreeMessage("");
      // opzionale: non resettare nome/azienda/email per invii multipli
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(
        typeof err?.message === "string" && err.message.trim()
          ? err.message.trim()
          : "Errore durante l’invio. Riprova tra poco."
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Sponsorizza la tua attività</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Raggiungi club e player in{" "}
          <span className="font-medium">tutta Italia</span> con annunci mirati su
          Club &amp; Player.
        </p>
      </div>

      {/* PACCHETTI */}
      <section className="mb-10">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Pacchetti (Beta) — Italia</h2>
          <Link
            href="/feed"
            className="text-sm font-medium underline underline-offset-4"
            style={{ color: BRAND_BLUE }}
          >
            Vedi la piattaforma
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(["starter", "growth", "performance"] as PackageId[]).map((id) => {
            const p = PACKAGES[id];
            const active = id === pkg;
            return (
              <div
                key={id}
                className={[
                  "rounded-xl border p-4 h-full flex flex-col",
                  active ? "border-black/30" : "border-black/10",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{p.label}</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {euro(p.basePriceProvince30d)}
                      <span className="ml-1 text-xs font-medium text-muted-foreground">
                        /30g
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex-1 text-xs text-muted-foreground">
                  <div className="min-h-[84px]">
                    <p className="font-medium text-foreground">Posizionamenti</p>
                    <ul className="mt-1 list-disc pl-4">
                      {p.placements.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3">
                    <p className="font-medium text-foreground">Include</p>
                    <ul className="mt-1 list-disc pl-4">
                      {p.includes.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPkg(id);
                    scrollToPreventivo();
                  }}
                  className={[
                    "mt-4 w-full rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-black text-white hover:bg-black/90"
                      : "bg-white text-black border border-black/15 hover:bg-black/5",
                  ].join(" ")}
                >
                  Seleziona
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          * Prezzi <span className="font-medium">beta</span>: la stima è
          indicativa e viene confermata dopo il contatto.
        </p>
      </section>

      {/* CONFIGURATORE */}
      <section ref={preventivoRef} className="mb-10">
        <h2 className="text-lg font-semibold">Configura il tuo preventivo</h2>
        <div className="mt-3 rounded-xl border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Target
              </label>
              <div className="mt-1 rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium">Italia</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Target nazionale su Club &amp; Player. (Opzionale: restringi con
                  Regione/Provincia/Città)
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Regione (opzionale)
              </label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={regionId}
                onChange={(e) => {
                  setRegionId(e.target.value);
                }}
              >
                <option value="">Seleziona regione (opzionale)</option>
                {regions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Provincia (opzionale)
              </label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={provinceId}
                onChange={(e) => {
                  setProvinceId(e.target.value);
                }}
                disabled={!regionId}
              >
                <option value="">Seleziona provincia (opzionale)</option>
                {provinces.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Città (opzionale)
              </label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={cityId}
                onChange={(e) => {
                  setCityId(e.target.value);
                }}
                disabled={!provinceId}
              >
                <option value="">Seleziona città (opzionale)</option>
                {cities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Obiettivo
              </label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={objective}
                onChange={(e) => setObjective(e.target.value as ObjectiveId)}
              >
                <option value="visibility">Visibilità (brand)</option>
                <option value="leads">Contatti (lead)</option>
                <option value="both">Entrambi (brand + contatti)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Durata
              </label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) as DurationId)}
              >
                <option value={30}>30 giorni</option>
                <option value={60}>60 giorni</option>
                <option value={90}>90 giorni</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Sconti/coefficiente già inclusi nella stima.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exclusive}
                  onChange={(e) => setExclusive(e.target.checked)}
                />
                <span className="font-medium">Esclusiva di categoria</span>
                <span className="text-xs text-muted-foreground">
                  (+40%, es. “solo 1 pizzeria” in SR)
                </span>
              </label>
            </div>
          </div>

          <div className="mt-4 rounded-xl border px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Riepilogo</p>
                <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line">
                  {leadSummary}
                </p>
              </div>

              <div
                className="shrink-0 rounded-lg px-3 py-2 text-right"
                style={{ background: `${BRAND_BLUE}0F` }}
              >
                <p className="text-xs font-medium text-muted-foreground">
                  Stima indicativa
                </p>
                <p className="text-xl font-semibold" style={{ color: BRAND_BLUE }}>
                  {euro(estimate)}
                </p>
                <p className="text-xs text-muted-foreground">
                  per {duration} giorni
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FORM CONTATTO */}
      <section>
        <h2 className="text-lg font-semibold">Richiedi informazioni</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Compila il form: riceverai una risposta con i dettagli e la conferma
          del preventivo.
        </p>

        <form onSubmit={onSubmit} className="mt-4 rounded-xl border p-4">
          {/* Honeypot (hidden) */}
          <div className="hidden">
            <label className="text-xs">Website</label>
            <input
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Nome e Cognome *
              </label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Mario Rossi"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Azienda / Attività *
              </label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Es. Pizzeria XYZ"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Email *
              </label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
                type="email"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Telefono (opzionale)
              </label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 ..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Messaggio (opzionale)
              </label>
              <textarea
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={freeMessage}
                onChange={(e) => setFreeMessage(e.target.value)}
                placeholder="Scrivi qui eventuali richieste (settore, obiettivo, link, preferenze...)"
                rows={5}
              />
            </div>
          </div>

          {status === "error" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {errorMsg}
            </div>
          )}

          {status === "success" && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Richiesta inviata! Ti contatteremo a breve.
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Inviando il form accetti che i dati vengano usati solo per
              ricontatto commerciale.
            </p>

            <button
              type="submit"
              disabled={status === "sending" || cooldownSeconds > 0}
              className={[
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                "text-white",
                status === "sending" || cooldownSeconds > 0
                  ? "bg-black/40 cursor-not-allowed"
                  : "bg-black hover:bg-black/90",
              ].join(" ")}
            >
              {status === "sending"
                ? "Invio in corso..."
                : cooldownSeconds > 0
                ? `Attendi ${cooldownSeconds}s`
                : "Invia richiesta"}
            </button>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Il riepilogo del preventivo viene incluso automaticamente nella
            richiesta.
          </div>
        </form>
      </section>
    </div>
  );
}
